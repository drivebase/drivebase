import { files, getDb } from "@drivebase/db";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { pubSub } from "../graphql/pubsub";
import { fileSizeBucket, telemetry } from "../posthog";
import { createBullMQConnection } from "../redis/client";
import { UploadSessionManager } from "../services/file/upload-session";
import { ProviderService } from "../services/provider";
import { logger } from "../utils/logger";
import type { UploadJobData } from "./upload-queue";

let uploadWorker: Worker<UploadJobData> | null = null;

/**
 * Start the upload worker
 */
export function startUploadWorker(): Worker<UploadJobData> {
	if (uploadWorker) {
		return uploadWorker;
	}

	uploadWorker = new Worker<UploadJobData>(
		"uploads",
		async (job) => {
			const {
				sessionId,
				fileId,
				providerId,
				assembledFilePath,
				fileName,
				mimeType,
				totalSize,
			} = job.data;

			logger.info({
				msg: "Upload worker processing job",
				jobId: job.id,
				sessionId,
				fileId,
				providerId,
			});

			const db = getDb();
			const sessionManager = new UploadSessionManager(db);
			const providerService = new ProviderService(db);

			try {
				// Update session status to transferring
				await sessionManager.updateProviderProgress(
					sessionId,
					0,
					"transferring",
				);

				// Publish initial progress event
				publishProgress(sessionId, {
					sessionId,
					status: "transferring",
					phase: "server_to_provider",
					receivedChunks: 0,
					totalChunks: 0,
					providerBytesTransferred: 0,
					totalSize,
					errorMessage: null,
				});

				// Get provider instance
				// We need to get the provider record without a userId check
				// since the worker runs asynchronously
				const session = await sessionManager.getSession(sessionId);
				if (!session) {
					throw new Error("Upload session not found");
				}

				const providerRecord = await providerService.getProvider(
					providerId,
					session.userId,
				);
				const provider =
					await providerService.getProviderInstance(providerRecord);

				if (
					provider.supportsChunkedUpload &&
					provider.initiateMultipartUpload &&
					provider.uploadPart &&
					provider.completeMultipartUpload
				) {
					// Native chunked upload path (Google Drive, etc.)
					// S3 direct multipart is handled client-side — this path is for proxy providers
					const parentId = providerRecord.rootFolderId ?? undefined;

					const multipart = await provider.initiateMultipartUpload({
						name: fileName,
						mimeType,
						size: totalSize,
						parentId,
					});

					// Read assembled file and upload in chunks
					const assembledFile = Bun.file(assembledFilePath);
					const chunkSize = session.chunkSize;
					const partResults: Array<{
						partNumber: number;
						etag: string;
					}> = [];
					let bytesTransferred = 0;

					for (let i = 0; i < session.totalChunks; i++) {
						const start = i * chunkSize;
						const end = Math.min(start + chunkSize, totalSize);
						const chunkData = Buffer.from(
							await assembledFile.slice(start, end).arrayBuffer(),
						);

						const partResult = await provider.uploadPart(
							multipart.uploadId,
							multipart.remoteId,
							i + 1, // 1-based part number
							chunkData,
						);
						partResults.push(partResult);

						bytesTransferred += chunkData.length;
						sessionManager
							.updateProviderProgress(sessionId, bytesTransferred)
							.catch(() => {});

						publishProgress(sessionId, {
							sessionId,
							status: "transferring",
							phase: "server_to_provider",
							receivedChunks: i + 1,
							totalChunks: session.totalChunks,
							providerBytesTransferred: bytesTransferred,
							totalSize,
							errorMessage: null,
						});
					}

					await provider.completeMultipartUpload(
						multipart.uploadId,
						multipart.remoteId,
						partResults,
					);

					// Update file remoteId
					if (fileId) {
						await db
							.update(files)
							.set({
								remoteId: multipart.remoteId,
								updatedAt: new Date(),
							})
							.where(eq(files.id, fileId));
					}
				} else {
					// Streaming upload path (providers without native chunking)
					const assembledFile = Bun.file(assembledFilePath);
					const fileSize = assembledFile.size;

					let bytesTransferred = 0;
					const progressStream = new TransformStream<Uint8Array, Uint8Array>({
						transform(chunk, controller) {
							bytesTransferred += chunk.byteLength;
							controller.enqueue(chunk);

							if (
								bytesTransferred % (1024 * 1024) < chunk.byteLength ||
								bytesTransferred === fileSize
							) {
								sessionManager
									.updateProviderProgress(sessionId, bytesTransferred)
									.catch(() => {});

								publishProgress(sessionId, {
									sessionId,
									status: "transferring",
									phase: "server_to_provider",
									receivedChunks: 0,
									totalChunks: 0,
									providerBytesTransferred: bytesTransferred,
									totalSize,
									errorMessage: null,
								});
							}
						},
					});

					const readableStream = assembledFile
						.stream()
						.pipeThrough(progressStream);

					const remoteId = fileId
						? (
								await db
									.select({ remoteId: files.remoteId })
									.from(files)
									.where(eq(files.id, fileId))
									.limit(1)
							)[0]?.remoteId
						: undefined;

					if (!remoteId) {
						throw new Error("File record not found or missing remoteId");
					}

					const newRemoteId = await provider.uploadFile(
						remoteId,
						readableStream,
					);

					if (fileId && newRemoteId && newRemoteId !== remoteId) {
						await db
							.update(files)
							.set({
								remoteId: newRemoteId,
								updatedAt: new Date(),
							})
							.where(eq(files.id, fileId));
					}
				}

				await provider.cleanup();

				// Mark session completed
				await sessionManager.markCompleted(sessionId);

				// Publish final progress event
				publishProgress(sessionId, {
					sessionId,
					status: "completed",
					phase: "server_to_provider",
					receivedChunks: 0,
					totalChunks: 0,
					providerBytesTransferred: totalSize,
					totalSize,
					errorMessage: null,
				});

				telemetry.capture("chunked_upload_completed", {
					provider_type: providerRecord.type,
					size_bucket: fileSizeBucket(totalSize),
				});

				logger.info({
					msg: "Upload worker completed",
					jobId: job.id,
					sessionId,
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				logger.error({
					msg: "Upload worker failed",
					jobId: job.id,
					sessionId,
					error: errorMessage,
				});

				telemetry.capture("chunked_upload_failed", {
					provider_type: providerId,
					reason: errorMessage,
				});

				// Mark session failed (leave temp files for retry)
				await sessionManager.markFailed(sessionId, errorMessage);

				// Publish failure event
				publishProgress(sessionId, {
					sessionId,
					status: "failed",
					phase: "server_to_provider",
					receivedChunks: 0,
					totalChunks: 0,
					providerBytesTransferred: 0,
					totalSize,
					errorMessage,
				});

				throw error; // Re-throw for BullMQ retry
			}
		},
		{
			connection: createBullMQConnection(),
			concurrency: 3,
		},
	);

	uploadWorker.on("error", (error) => {
		logger.error({ msg: "Upload worker error", error: error.message });
	});

	logger.info("Upload worker started");

	return uploadWorker;
}

/**
 * Stop the upload worker
 */
export async function stopUploadWorker(): Promise<void> {
	if (uploadWorker) {
		await uploadWorker.close();
		uploadWorker = null;
		logger.info("Upload worker stopped");
	}
}

/**
 * Publish upload progress event via PubSub
 */
function publishProgress(
	sessionId: string,
	payload: {
		sessionId: string;
		status: string;
		phase: string;
		receivedChunks: number;
		totalChunks: number;
		providerBytesTransferred: number;
		totalSize: number;
		errorMessage: string | null;
	},
): void {
	pubSub.publish("uploadProgress", sessionId, payload);
}
