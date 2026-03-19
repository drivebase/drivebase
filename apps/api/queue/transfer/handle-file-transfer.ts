import { mkdir, open, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { joinPath } from "@drivebase/core";
import { files, getDb, jobs } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { ProviderFileTransferJobData } from "@/queue/transfer/queue";
import { ActivityService } from "@/service/activity";
import { getFile } from "@/service/file/query/file-read";
import type { ProviderService } from "@/service/provider";
import { waitForJobResolution } from "@/utils/jobs/job-pause";
import { logger } from "@/utils/runtime/logger";
import {
	checkFileConflict,
	getTargetFolder,
	getUniqueFilename,
} from "./conflict";
import {
	DEFAULT_TRANSFER_CHUNK_SIZE,
	type FileTransferCacheManifest,
	type JobContext,
} from "./types";
import {
	getTransferCacheRoot,
	getTransferProgress,
	readManifest,
	writeManifest,
} from "./utils";

export async function handleFileTransfer(
	ctx: JobContext,
	data: ProviderFileTransferJobData,
) {
	const db = getDb();
	const {
		activityService,
		providerService,
		jobId,
		workspaceId,
		userId,
		assertNotCancelled,
		updateActivity,
	} = ctx;
	const { fileId, targetProviderId, targetFolderId, operation } = data;
	logger.debug({
		msg: "[transfer:file] starting",
		jobId,
		fileId,
		targetProviderId,
		targetFolderId,
		operation,
		parentJobId: data.parentJobId ?? null,
	});

	let sourceProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;
	let targetProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;

	try {
		await updateActivity({
			status: "running",
			message: "Preparing transfer",
			progress: 0,
			metadata: {
				phase: "prepare",
				entity: "file",
				operation,
			},
		});

		let file: Awaited<ReturnType<typeof getFile>>;
		// Fix 2: Replace empty catch with proper logging
		try {
			file = await getFile(db, fileId, userId, workspaceId);
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			logger.error({
				msg: "[transfer:file] source file lookup failed",
				jobId,
				fileId,
				workspaceId,
				targetProviderId,
				error: errMsg,
			});
			await activityService.fail(jobId, `File not found: ${fileId}`);
			return;
		}

		const folder = await getTargetFolder(workspaceId, targetFolderId ?? null);
		if (folder && folder.providerId !== targetProviderId) {
			throw new Error("Target folder does not belong to target provider");
		}

		const destinationPath = joinPath(folder?.virtualPath ?? "/", file.name);
		let finalDestinationPath = destinationPath;
		let finalFileName = file.name;

		const existingConflict = await checkFileConflict(
			destinationPath,
			targetProviderId,
			operation === "cut" ? file.id : undefined,
		);

		if (existingConflict) {
			let resolution: "overwrite" | "skip" | "duplicate" | null = null;
			let batchJob: any = null;

			if (data.parentJobId) {
				[batchJob] = await db
					.select()
					.from(jobs)
					.where(eq(jobs.id, data.parentJobId))
					.limit(1);

				if (batchJob?.metadata?.conflictResolution) {
					resolution = batchJob.metadata.conflictResolution as
						| "overwrite"
						| "skip"
						| "duplicate";
				}
			}

			if (!resolution) {
				await updateActivity({
					status: "paused",
					message: `Waiting for user: File '${file.name}' already exists`,
					metadata: {
						phase: "conflict",
						conflictFileId: existingConflict.id,
						destinationPath,
						fileName: file.name,
					},
				});

				// Fix 4: Use static import (already imported at top of file)
				const res = await waitForJobResolution<{
					action: "overwrite" | "skip" | "duplicate";
					applyToAll?: boolean;
				}>(jobId);
				resolution = res.action;

				if (res.applyToAll && data.parentJobId) {
					const batchActivityService = new ActivityService(db);
					await batchActivityService.update(data.parentJobId, {
						metadata: {
							...(batchJob?.metadata ?? {}),
							conflictResolution: resolution,
						},
						suppressEvent: true, // Don't broadcast the internal state update
					});
				}
			}

			if (resolution === "skip") {
				await activityService.complete(jobId, "Skipped by user");
				return;
			}

			if (resolution === "duplicate") {
				const unique = await getUniqueFilename(
					destinationPath,
					targetProviderId,
				);
				finalDestinationPath = unique.path;
				finalFileName = unique.name;

				await updateActivity({
					status: "running",
					message: `Duplicating as '${finalFileName}'`,
					metadata: {
						phase: "prepare",
						finalFileName,
						finalDestinationPath,
					},
				});
			}

			if (resolution === "overwrite") {
				// Initialize target provider early to delete the conflicting file
				const targetRecord = await providerService.getProvider(
					targetProviderId,
					userId,
					workspaceId,
				);
				targetProvider =
					await providerService.getProviderInstance(targetRecord);

				try {
					await targetProvider.delete({
						remoteId: existingConflict.remoteId,
						isFolder: false,
					});
				} catch (deleteErr) {
					logger.warn({
						msg: "Failed to delete remote conflicting file",
						error: deleteErr,
					});
				}
				await db.delete(files).where(eq(files.id, existingConflict.id));

				// Update activity back to running
				await updateActivity({
					status: "running",
					message: "Resuming transfer",
					metadata: { phase: "prepare" },
				});
			}
		}

		// ── Same-provider fast path ─────────────────────────────────────────────
		if (file.providerId === targetProviderId) {
			await updateActivity({
				message: operation === "cut" ? "Moving file" : "Copying file",
				progress: 0.5,
				metadata: { phase: "native_op", entity: "file", operation },
			});
			await assertNotCancelled();

			const sameRecord = await providerService.getProvider(
				targetProviderId,
				userId,
				workspaceId,
			);
			const sameProvider =
				await providerService.getProviderInstance(sameRecord);

			try {
				if (operation === "cut") {
					await sameProvider.move({
						remoteId: file.remoteId,
						newParentId: folder?.remoteId,
						...(finalFileName !== file.name ? { newName: finalFileName } : {}),
					});
					await db
						.update(files)
						.set({
							folderId: folder?.id ?? null,
							virtualPath: finalDestinationPath,
							name: finalFileName,
							updatedAt: new Date(),
						})
						.where(eq(files.id, file.id));
				} else {
					const copiedRemoteId = await sameProvider.copy({
						remoteId: file.remoteId,
						targetParentId: folder?.remoteId,
						...(finalFileName !== file.name ? { newName: finalFileName } : {}),
					});
					await db.insert(files).values({
						nodeType: "file",
						virtualPath: finalDestinationPath,
						name: finalFileName,
						mimeType: file.mimeType,
						size: file.size,
						hash: file.hash,
						remoteId: copiedRemoteId,
						providerId: targetProviderId,
						workspaceId,
						folderId: folder?.id ?? null,
						uploadedBy: userId,
						isDeleted: false,
					});
				}
			} finally {
				await sameProvider.cleanup().catch(() => {});
			}

			await activityService.complete(
				jobId,
				operation === "cut" ? "File moved" : "File copied",
			);
			return;
		}
		// ── Cross-provider: download from source, upload to target ───────────────

		const transferDir = join(
			getTransferCacheRoot(),
			workspaceId,
			file.id,
			jobId,
		);
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
		sourceProvider = await providerService.getProviderInstance(sourceRecord);
		targetProvider = await providerService.getProviderInstance(targetRecord);

		const manifest =
			(await readManifest(manifestPath)) ??
			({
				fileId: file.id,
				sourceProviderId: file.providerId,
				targetProviderId,
				totalSize: file.size,
				downloadedBytes: 0,
				uploadedBytes: 0,
			} satisfies FileTransferCacheManifest);

		const cachedStats = await stat(cachedFilePath).catch(() => null);
		const hasFullCache =
			Boolean(cachedStats) && manifest.downloadedBytes >= file.size;

		if (!hasFullCache) {
			await updateActivity({
				message: "Downloading from source provider",
				progress: getTransferProgress(0, manifest.uploadedBytes, file.size),
				metadata: {
					phase: "download",
					entity: "file",
					operation,
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
						const pct = (
							(downloadedBytes / Math.max(file.size, 1)) *
							100
						).toFixed(1);
						await writeManifest(manifestPath, manifest);
						await updateActivity({
							message: `Downloading ${pct}%`,
							progress: getTransferProgress(
								downloadedBytes,
								manifest.uploadedBytes,
								file.size,
							),
							metadata: {
								phase: "download",
								entity: "file",
								operation,
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
		}

		await updateActivity({
			message: "Uploading to target provider",
			progress: getTransferProgress(
				manifest.downloadedBytes,
				manifest.uploadedBytes,
				file.size,
			),
			metadata: {
				phase: "upload",
				entity: "file",
				operation,
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
					name: finalFileName,
					mimeType: file.mimeType,
					size: file.size,
					parentId: folder?.remoteId,
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
				if (uploadedParts.has(partNumber)) continue;

				const start = (partNumber - 1) * DEFAULT_TRANSFER_CHUNK_SIZE;
				const end = Math.min(start + DEFAULT_TRANSFER_CHUNK_SIZE, file.size);
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
				if (uploadResult.finalRemoteId) {
					manifest.multipart.finalRemoteId = uploadResult.finalRemoteId;
				}
				manifest.multipart.parts.push(partState);
				uploadedParts.set(uploadResult.partNumber, partState);
				uploadedBytes += chunkData.length;
				manifest.uploadedBytes = uploadedBytes;

				const pct = ((uploadedBytes / Math.max(file.size, 1)) * 100).toFixed(1);
				await writeManifest(manifestPath, manifest);
				await updateActivity({
					message: `Uploading ${pct}%`,
					progress: getTransferProgress(
						manifest.downloadedBytes,
						uploadedBytes,
						file.size,
					),
					metadata: {
						phase: "upload",
						entity: "file",
						operation,
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
			finalRemoteId =
				manifest.multipart.finalRemoteId ?? manifest.multipart.remoteId;
		} else {
			const uploadResponse = await targetProvider.requestUpload({
				name: finalFileName,
				mimeType: file.mimeType,
				size: file.size,
				parentId: folder?.remoteId,
			});

			let uploadedBytes = 0;
			let lastReportedBytes = 0;
			const progressStream = new TransformStream<Uint8Array, Uint8Array>({
				async transform(chunk, controller) {
					await assertNotCancelled();
					uploadedBytes += chunk.byteLength;
					controller.enqueue(chunk);

					if (
						uploadedBytes - lastReportedBytes >= DEFAULT_TRANSFER_CHUNK_SIZE ||
						uploadedBytes === file.size
					) {
						const pct = (
							(uploadedBytes / Math.max(file.size, 1)) *
							100
						).toFixed(1);
						lastReportedBytes = uploadedBytes;
						manifest.uploadedBytes = uploadedBytes;
						writeManifest(manifestPath, manifest).catch(() => {});
						updateActivity({
							message: `Uploading ${pct}%`,
							progress: getTransferProgress(
								manifest.downloadedBytes,
								uploadedBytes,
								file.size,
							),
							metadata: {
								phase: "upload",
								entity: "file",
								operation,
								downloadedBytes: manifest.downloadedBytes,
								uploadedBytes,
								totalSize: file.size,
							},
						}).catch(() => {});
					}
				},
			});

			const readableStream = Bun.file(cachedFilePath)
				.stream()
				.pipeThrough(progressStream);
			const maybeRemoteId = await targetProvider.uploadFile(
				uploadResponse.fileId,
				readableStream,
			);
			finalRemoteId = maybeRemoteId || uploadResponse.fileId;
		}

		if (operation === "cut") {
			logger.debug({
				msg: "[transfer:file] finalizing cut",
				jobId,
				fileId: file.id,
				sourceRemoteId: file.remoteId,
				targetRemoteId: finalRemoteId,
				finalDestinationPath,
			});

			const sourceRemoteId = file.remoteId;
			const sourceProviderId = file.providerId;

			const [updated] = await db
				.update(files)
				.set({
					providerId: targetProviderId,
					remoteId: finalRemoteId,
					folderId: folder?.id ?? null,
					virtualPath: finalDestinationPath,
					name: finalFileName,
					updatedAt: new Date(),
				})
				.where(eq(files.id, file.id))
				.returning();

			if (!updated) {
				throw new Error("Failed to update file record after transfer");
			}

			await assertNotCancelled();

			try {
				await sourceProvider.delete({
					remoteId: sourceRemoteId,
					isFolder: false,
				});
			} catch (deleteError) {
				logger.warn({
					msg: "[transfer:file] source deletion failed after DB update; file duplicated on source provider",
					jobId,
					fileId: file.id,
					sourceProviderId,
					sourceRemoteId,
					error:
						deleteError instanceof Error
							? deleteError.message
							: String(deleteError),
				});
			}

			logger.debug({
				msg: "[transfer:file] cut finalized",
				jobId,
				fileId: file.id,
				targetProviderId,
				targetFolderId: folder?.id ?? null,
				finalDestinationPath,
			});
		} else {
			const [inserted] = await db
				.insert(files)
				.values({
					nodeType: "file",
					virtualPath: finalDestinationPath,
					name: finalFileName,
					mimeType: file.mimeType,
					size: file.size,
					hash: file.hash,
					remoteId: finalRemoteId,
					providerId: targetProviderId,
					workspaceId,
					folderId: folder?.id ?? null,
					uploadedBy: userId,
					isDeleted: false,
				})
				.returning();
			if (!inserted) {
				throw new Error("Failed to insert copied file");
			}
			logger.debug({
				msg: "[transfer:file] copy finalized",
				jobId,
				sourceFileId: file.id,
				copiedFileId: inserted.id,
				targetProviderId,
				targetFolderId: folder?.id ?? null,
				finalDestinationPath,
			});
		}

		await activityService.complete(jobId, "Transfer completed");
		await activityService.log({
			kind: "file.transfer.completed",
			title: "Provider transfer completed",
			summary: finalFileName,
			status: "success",
			userId,
			workspaceId,
			details: {
				fileId: file.id,
				providerId: targetProviderId,
				sourceProviderId: file.providerId,
				targetProviderId,
				jobId,
				operation,
				parentJobId: data.parentJobId,
			},
		});

		await rm(transferDir, { recursive: true, force: true });
	} finally {
		if (sourceProvider) {
			await sourceProvider.cleanup().catch(() => {});
		}
		if (targetProvider) {
			await targetProvider.cleanup().catch(() => {});
		}
	}
}
