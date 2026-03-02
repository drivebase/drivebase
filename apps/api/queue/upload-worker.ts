import {
	fileContents,
	files,
	getDb,
	storageProviders,
	workspaces,
} from "@drivebase/db";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { pubSub } from "../graphql/pubsub";
import { createBullMQConnection } from "../redis/client";
import { logFileOperationDebugError } from "../service/file/shared/file-error-log";
import { UploadSessionManager } from "../service/file/upload";
import { ProviderService } from "../service/provider";
import { fileSizeBucket, telemetry } from "../telemetry";
import { isExtractionSupported } from "../utils/extraction";
import { logger } from "../utils/logger";
import { getExtractionQueue } from "./extraction-queue";
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
					const parentId: string | undefined = undefined;

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

				// Auto-extract content if smart search is enabled
				if (fileId) {
					await enqueueExtractionIfEnabled(db, fileId, mimeType);
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				logFileOperationDebugError({
					operation: "upload",
					stage: "worker_provider_transfer",
					context: {
						jobId: String(job.id ?? ""),
						sessionId,
						fileId: fileId ?? undefined,
						providerId: providerId ?? undefined,
						attempt: job.attemptsMade + 1,
					},
					error,
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
		logFileOperationDebugError({
			operation: "upload",
			stage: "worker_runtime",
			context: {},
			error,
		});
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
 * Enqueue content extraction if the workspace has smart search enabled.
 */
async function enqueueExtractionIfEnabled(
	db: ReturnType<typeof getDb>,
	fileId: string,
	mimeType: string,
): Promise<void> {
	try {
		if (!isExtractionSupported(mimeType)) {
			logger.debug({
				msg: "Auto-extract skipped: unsupported MIME type",
				fileId,
				mimeType,
			});
			return;
		}

		const [file] = await db
			.select({
				providerId: files.providerId,
				workspaceId: storageProviders.workspaceId,
			})
			.from(files)
			.innerJoin(storageProviders, eq(files.providerId, storageProviders.id))
			.where(eq(files.id, fileId))
			.limit(1);

		if (!file?.workspaceId) return;

		const [workspace] = await db
			.select({ smartSearchEnabled: workspaces.smartSearchEnabled })
			.from(workspaces)
			.where(eq(workspaces.id, file.workspaceId))
			.limit(1);

		if (!workspace?.smartSearchEnabled) {
			logger.debug({
				msg: "Auto-extract skipped: smart search disabled for workspace",
				fileId,
				workspaceId: file.workspaceId,
			});
			return;
		}

		logger.debug({
			msg: "Auto-extract: enqueueing extraction for uploaded file",
			fileId,
			mimeType,
			workspaceId: file.workspaceId,
		});

		// Create file_contents record and enqueue extraction
		await db
			.insert(fileContents)
			.values({
				nodeId: fileId,
				workspaceId: file.workspaceId,
				extractionStatus: "pending",
			})
			.onConflictDoNothing();

		const queue = getExtractionQueue();
		await queue.add(
			`extract-${fileId}`,
			{ nodeId: fileId, workspaceId: file.workspaceId },
			{ jobId: `extract-${fileId}` },
		);
	} catch (error) {
		// Don't fail the upload if extraction enqueueing fails
		logger.warn({
			msg: "Failed to enqueue content extraction",
			fileId,
			error: error instanceof Error ? error.message : String(error),
		});
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
