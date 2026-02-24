import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { files, folders, getDb } from "@drivebase/db";
import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { createBullMQConnection, getRedis } from "../redis/client";
import { ActivityService } from "../services/activity";
import { ProviderService } from "../services/provider";
import { logger } from "../utils/logger";
import type { ProviderTransferJobData } from "./transfer-queue";

const DEFAULT_TRANSFER_CHUNK_SIZE = 8 * 1024 * 1024;

class TransferCancelledError extends Error {
	constructor() {
		super("Transfer cancelled");
		this.name = "TransferCancelledError";
	}
}

interface TransferManifest {
	fileId: string;
	sourceProviderId: string;
	targetProviderId: string;
	totalSize: number;
	downloadedBytes: number;
	uploadedBytes: number;
	multipart?: {
		uploadId: string;
		remoteId: string;
		parts: Array<{ partNumber: number; etag: string; size: number }>;
	};
}

let transferWorker: Worker<ProviderTransferJobData> | null = null;

function getTransferCacheRoot(): string {
	return env.TRANSFER_CACHE_DIR ?? join(env.DATA_DIR, "transfers");
}

function getTransferCancelKey(jobId: string): string {
	return `transfer:cancel:${jobId}`;
}

function clampProgress(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function getTransferProgress(
	downloadedBytes: number,
	uploadedBytes: number,
	totalSize: number,
): number {
	const safeTotal = Math.max(totalSize, 1);
	const downloadWeight = 0.5;
	const uploadWeight = 0.5;
	const downloadProgress = clampProgress(downloadedBytes / safeTotal);
	const uploadProgress = clampProgress(uploadedBytes / safeTotal);
	return clampProgress(
		downloadProgress * downloadWeight + uploadProgress * uploadWeight,
	);
}

async function readManifest(path: string): Promise<TransferManifest | null> {
	try {
		const content = await readFile(path, "utf-8");
		return JSON.parse(content) as TransferManifest;
	} catch {
		return null;
	}
}

async function writeManifest(
	path: string,
	manifest: TransferManifest,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(manifest, null, 2), "utf-8");
}

export function startTransferWorker(): Worker<ProviderTransferJobData> {
	if (transferWorker) {
		return transferWorker;
	}

	transferWorker = new Worker<ProviderTransferJobData>(
		"provider-transfers",
		async (bullJob) => {
			const db = getDb();
			const activityService = new ActivityService(db);
			const providerService = new ProviderService(db);
			const { jobId, workspaceId, userId, fileId, targetProviderId } =
				bullJob.data;
			const redis = getRedis();

			const assertNotCancelled = async () => {
				const cancelled = await redis.get(getTransferCancelKey(jobId));
				if (cancelled) {
					throw new TransferCancelledError();
				}
			};

			let sourceProvider: Awaited<
				ReturnType<ProviderService["getProviderInstance"]>
			> | null = null;
			let targetProvider: Awaited<
				ReturnType<ProviderService["getProviderInstance"]>
			> | null = null;

			try {
				await activityService.update(jobId, {
					status: "running",
					message: "Preparing transfer",
					progress: 0,
					metadata: {
						phase: "prepare",
						retryAttempt: bullJob.attemptsMade + 1,
						retryMax:
							typeof bullJob.opts.attempts === "number"
								? bullJob.opts.attempts
								: 1,
					},
				});
				await assertNotCancelled();

				const [file] = await db
					.select()
					.from(files)
					.where(eq(files.id, fileId))
					.limit(1);

				if (!file) {
					await activityService.fail(jobId, "File not found");
					return;
				}

				if (file.providerId === targetProviderId) {
					await activityService.fail(jobId, "File is already on this provider");
					return;
				}

				const transferDir = join(getTransferCacheRoot(), workspaceId, file.id);
				const cachedFilePath = join(transferDir, "payload.bin");
				const manifestPath = join(transferDir, "manifest.json");

				await mkdir(transferDir, { recursive: true });
				await assertNotCancelled();

				const sourceRecord = await providerService.getProvider(
					file.providerId,
					userId,
					workspaceId,
				);
				const targetRecord = await providerService.getProvider(
					targetProviderId,
					userId,
					workspaceId,
				);
				sourceProvider =
					await providerService.getProviderInstance(sourceRecord);
				targetProvider =
					await providerService.getProviderInstance(targetRecord);

				let manifest =
					(await readManifest(manifestPath)) ??
					({
						fileId: file.id,
						sourceProviderId: file.providerId,
						targetProviderId,
						totalSize: file.size,
						downloadedBytes: 0,
						uploadedBytes: 0,
					} satisfies TransferManifest);

				const cachedStats = await stat(cachedFilePath).catch(() => null);
				const hasFullCache =
					Boolean(cachedStats) && manifest.downloadedBytes >= file.size;

				if (!hasFullCache) {
					await activityService.update(jobId, {
						message: "Downloading from source provider",
						progress: getTransferProgress(0, manifest.uploadedBytes, file.size),
						metadata: {
							phase: "download",
							downloadedBytes: 0,
							uploadedBytes: manifest.uploadedBytes,
							totalSize: file.size,
						},
					});

					const sourceStream = await sourceProvider.downloadFile(file.remoteId);
					const reader = sourceStream.getReader();
					const handle = await open(cachedFilePath, "w");
					let downloadedBytes = 0;

					try {
						while (true) {
							await assertNotCancelled();
							const { done, value } = await reader.read();
							if (done) break;
							if (!value) continue;

							const chunk = Buffer.from(value);
							await handle.write(chunk, 0, chunk.length, downloadedBytes);
							downloadedBytes += chunk.length;
							manifest.downloadedBytes = downloadedBytes;

							if (
								downloadedBytes % DEFAULT_TRANSFER_CHUNK_SIZE < chunk.length ||
								downloadedBytes === file.size
							) {
								await writeManifest(manifestPath, manifest);
								await activityService.update(jobId, {
									message: `Downloading ${((downloadedBytes / Math.max(file.size, 1)) * 100).toFixed(0)}%`,
									progress: getTransferProgress(
										downloadedBytes,
										manifest.uploadedBytes,
										file.size,
									),
									metadata: {
										phase: "download",
										downloadedBytes,
										uploadedBytes: manifest.uploadedBytes,
										totalSize: file.size,
									},
								});
							}
						}
					} finally {
						await handle.close();
						reader.releaseLock();
					}

					manifest.downloadedBytes = file.size;
					await writeManifest(manifestPath, manifest);
				} else {
					manifest.downloadedBytes = file.size;
					await writeManifest(manifestPath, manifest);
				}

				let targetParentId: string | undefined;
				if (file.folderId) {
					const [folder] = await db
						.select()
						.from(folders)
						.where(
							and(
								eq(folders.id, file.folderId),
								eq(folders.nodeType, "folder"),
								eq(folders.providerId, targetProviderId),
							),
						)
						.limit(1);
					if (folder) {
						targetParentId = folder.remoteId;
					}
				}

				await activityService.update(jobId, {
					message: "Uploading to target provider",
					progress: getTransferProgress(
						manifest.downloadedBytes,
						manifest.uploadedBytes,
						file.size,
					),
					metadata: {
						phase: "upload",
						downloadedBytes: manifest.downloadedBytes,
						uploadedBytes: manifest.uploadedBytes,
						totalSize: file.size,
					},
				});

				let finalRemoteId: string;
				if (
					targetProvider.supportsChunkedUpload &&
					targetProvider.initiateMultipartUpload &&
					targetProvider.uploadPart &&
					targetProvider.completeMultipartUpload
				) {
					if (!manifest.multipart) {
						const multipart = await targetProvider.initiateMultipartUpload({
							name: file.name,
							mimeType: file.mimeType,
							size: file.size,
							parentId: targetParentId,
						});
						manifest.multipart = {
							uploadId: multipart.uploadId,
							remoteId: multipart.remoteId,
							parts: [],
						};
						await writeManifest(manifestPath, manifest);
					}

					const cachedFile = Bun.file(cachedFilePath);
					const uploadedParts = new Map(
						manifest.multipart.parts.map((part) => [part.partNumber, part]),
					);

					let uploadedBytes = manifest.multipart.parts.reduce(
						(sum, part) => sum + part.size,
						0,
					);
					manifest.uploadedBytes = uploadedBytes;

					const partCount = Math.max(
						1,
						Math.ceil(file.size / DEFAULT_TRANSFER_CHUNK_SIZE),
					);

					for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
						await assertNotCancelled();
						if (uploadedParts.has(partNumber)) {
							continue;
						}

						const start = (partNumber - 1) * DEFAULT_TRANSFER_CHUNK_SIZE;
						const end = Math.min(
							start + DEFAULT_TRANSFER_CHUNK_SIZE,
							file.size,
						);
						const chunkData = Buffer.from(
							await cachedFile.slice(start, end).arrayBuffer(),
						);

						const uploadResult = await targetProvider.uploadPart(
							manifest.multipart.uploadId,
							manifest.multipart.remoteId,
							partNumber,
							chunkData,
						);

						const partState = {
							partNumber: uploadResult.partNumber,
							etag: uploadResult.etag,
							size: chunkData.length,
						};
						manifest.multipart.parts.push(partState);
						uploadedParts.set(uploadResult.partNumber, partState);
						uploadedBytes += chunkData.length;
						manifest.uploadedBytes = uploadedBytes;

						await writeManifest(manifestPath, manifest);
						await activityService.update(jobId, {
							message: `Uploading ${((uploadedBytes / Math.max(file.size, 1)) * 100).toFixed(0)}%`,
							progress: getTransferProgress(
								manifest.downloadedBytes,
								uploadedBytes,
								file.size,
							),
							metadata: {
								phase: "upload",
								downloadedBytes: manifest.downloadedBytes,
								uploadedBytes,
								totalSize: file.size,
							},
						});
					}

					await assertNotCancelled();
					await targetProvider.completeMultipartUpload(
						manifest.multipart.uploadId,
						manifest.multipart.remoteId,
						manifest.multipart.parts
							.sort((a, b) => a.partNumber - b.partNumber)
							.map((part) => ({
								partNumber: part.partNumber,
								etag: part.etag,
							})),
					);

					finalRemoteId = manifest.multipart.remoteId;
					manifest.uploadedBytes = file.size;
					await writeManifest(manifestPath, manifest);
				} else {
					const uploadResponse = await targetProvider.requestUpload({
						name: file.name,
						mimeType: file.mimeType,
						size: file.size,
						parentId: targetParentId,
					});

					let uploadedBytes = 0;
					let lastReportedBytes = 0;
					const progressStream = new TransformStream<Uint8Array, Uint8Array>({
						transform(chunk, controller) {
							uploadedBytes += chunk.byteLength;
							controller.enqueue(chunk);

							if (
								uploadedBytes - lastReportedBytes >=
									DEFAULT_TRANSFER_CHUNK_SIZE ||
								uploadedBytes === file.size
							) {
								lastReportedBytes = uploadedBytes;
								manifest.uploadedBytes = uploadedBytes;
								writeManifest(manifestPath, manifest).catch(() => {});
								activityService
									.update(jobId, {
										message: `Uploading ${(
											(uploadedBytes / Math.max(file.size, 1)) * 100
										).toFixed(0)}%`,
										progress: getTransferProgress(
											manifest.downloadedBytes,
											uploadedBytes,
											file.size,
										),
										metadata: {
											phase: "upload",
											downloadedBytes: manifest.downloadedBytes,
											uploadedBytes,
											totalSize: file.size,
										},
									})
									.catch(() => {});
							}
						},
					});

					const readableStream = Bun.file(cachedFilePath)
						.stream()
						.pipeThrough(progressStream);
					await assertNotCancelled();
					const maybeRemoteId = await targetProvider.uploadFile(
						uploadResponse.fileId,
						readableStream,
					);
					finalRemoteId = maybeRemoteId || uploadResponse.fileId;
					manifest.uploadedBytes = Math.max(uploadedBytes, file.size);
					await writeManifest(manifestPath, manifest);
				}

				await sourceProvider.delete({
					remoteId: file.remoteId,
					isFolder: false,
				});
				await assertNotCancelled();

				const [updated] = await db
					.update(files)
					.set({
						providerId: targetProviderId,
						remoteId: finalRemoteId,
						updatedAt: new Date(),
					})
					.where(eq(files.id, file.id))
					.returning();

				if (!updated) {
					throw new Error("Failed to update file record after transfer");
				}

				await activityService.complete(jobId, "Transfer completed");
				await rm(transferDir, { recursive: true, force: true });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (error instanceof TransferCancelledError) {
					await activityService.update(jobId, {
						status: "error",
						message: "Transfer cancelled",
						metadata: {
							phase: "cancelled",
							cancelled: true,
						},
					});
					return;
				}
				const currentAttempt = bullJob.attemptsMade + 1;
				const maxAttempts =
					typeof bullJob.opts.attempts === "number" ? bullJob.opts.attempts : 1;
				const willRetry = currentAttempt < maxAttempts;

				logger.error({
					msg: "Provider transfer job failed",
					jobId,
					fileId,
					targetProviderId,
					error: message,
					retryAttempt: currentAttempt,
					retryMax: maxAttempts,
					willRetry,
				});

				if (willRetry) {
					await activityService.update(jobId, {
						status: "error",
						message: `Transfer failed. Retrying (${currentAttempt}/${maxAttempts})`,
						metadata: {
							phase: "retry",
							error: message,
							retryAttempt: currentAttempt,
							retryMax: maxAttempts,
							willRetry: true,
						},
					});
				} else {
					await activityService.update(jobId, {
						status: "error",
						message: `Transfer failed after ${currentAttempt}/${maxAttempts} attempts`,
						metadata: {
							phase: "failed",
							error: message,
							retryAttempt: currentAttempt,
							retryMax: maxAttempts,
							willRetry: false,
						},
					});
				}
				throw error;
			} finally {
				await redis.del(getTransferCancelKey(jobId)).catch(() => {});
				if (sourceProvider) {
					await sourceProvider.cleanup().catch(() => {});
				}
				if (targetProvider) {
					await targetProvider.cleanup().catch(() => {});
				}
			}
		},
		{
			connection: createBullMQConnection(),
			concurrency: 2,
		},
	);

	transferWorker.on("failed", (job, error) => {
		logger.error({
			msg: "Transfer worker failed",
			jobId: job?.id,
			error: error.message,
		});
	});

	logger.info("Transfer worker started");
	return transferWorker;
}

export async function stopTransferWorker(): Promise<void> {
	if (transferWorker) {
		await transferWorker.close();
		transferWorker = null;
		logger.info("Transfer worker stopped");
	}
}
