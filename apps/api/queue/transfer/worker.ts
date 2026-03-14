import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConflictError, joinPath } from "@drivebase/core";
import { files, folders, getDb, jobs, type Folder } from "@drivebase/db";
import { Worker } from "bullmq";
import { and, eq, inArray, like } from "drizzle-orm";
import { env } from "@/config/env";
import { createBullMQConnection } from "@/redis/client";
import { enqueueProviderTransfer } from "@/queue/transfer/enqueue";
import {
	isFileTransferJobData,
	type ProviderFileTransferJobData,
	type ProviderFolderTransferJobData,
	type ProviderTransferJobData,
} from "@/queue/transfer/queue";
import { ActivityService } from "@/service/activity";
import { moveFolder } from "@/service/folder/mutation";
import { ProviderService } from "@/service/provider";
import {
	assertNotCancelled as assertJobNotCancelled,
	clearJobCancellation,
	JobCancelledError,
} from "@/utils/jobs/job-cancel";
import { logger } from "@/utils/runtime/logger";

const DEFAULT_TRANSFER_CHUNK_SIZE = 8 * 1024 * 1024;

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
		finalRemoteId?: string;
		parts: Array<{ partNumber: number; etag: string; size: number }>;
	};
}

export interface JobContext {
	activityService: ActivityService;
	providerService: ProviderService;
	jobId: string;
	workspaceId: string;
	userId: string;
	assertNotCancelled: () => Promise<void>;
	updateActivity: (input: {
		progress?: number;
		message?: string;
		status?: "pending" | "running" | "completed" | "error";
		metadata?: Record<string, unknown>;
	}) => Promise<void>;
}

function getTransferCacheRoot(): string {
	return env.TRANSFER_CACHE_DIR ?? join(env.DATA_DIR, "transfers");
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
	const downloadProgress = clampProgress(downloadedBytes / safeTotal);
	const uploadProgress = clampProgress(uploadedBytes / safeTotal);
	return clampProgress(downloadProgress * 0.5 + uploadProgress * 0.5);
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

function normalizeJobData(data: unknown): ProviderTransferJobData {
	const legacy = data as {
		entity?: "file" | "folder";
		targetFolderId?: string | null;
		operation?: "cut" | "copy";
		fileId?: string;
		targetProviderId?: string;
		folderId?: string;
		jobId: string;
		workspaceId: string;
		userId: string;
		parentJobId?: string;
	};
	if (legacy.entity === "file") {
		if (!legacy.fileId || !legacy.targetProviderId || !legacy.operation) {
			throw new Error("Invalid file transfer payload");
		}
		return {
			entity: "file",
			jobId: legacy.jobId,
			workspaceId: legacy.workspaceId,
			userId: legacy.userId,
			fileId: legacy.fileId,
			targetProviderId: legacy.targetProviderId,
			targetFolderId: legacy.targetFolderId ?? null,
			operation: legacy.operation,
			parentJobId: legacy.parentJobId,
		};
	}
	if (legacy.entity === "folder") {
		if (!legacy.folderId || !legacy.operation) {
			throw new Error("Invalid folder transfer payload");
		}
		return {
			entity: "folder",
			jobId: legacy.jobId,
			workspaceId: legacy.workspaceId,
			userId: legacy.userId,
			folderId: legacy.folderId,
			targetFolderId: legacy.targetFolderId ?? null,
			operation: legacy.operation,
			parentJobId: legacy.parentJobId,
		};
	}

	if (!legacy.fileId || !legacy.targetProviderId) {
		throw new Error("Invalid transfer job payload");
	}

	return {
		entity: "file",
		jobId: legacy.jobId,
		workspaceId: legacy.workspaceId,
		userId: legacy.userId,
		fileId: legacy.fileId,
		targetProviderId: legacy.targetProviderId,
		targetFolderId: legacy.targetFolderId ?? null,
		operation: legacy.operation ?? "cut",
		parentJobId: legacy.parentJobId,
	};
}

function isNonRetryableTransferError(error: unknown): boolean {
	if (error instanceof ConflictError) {
		return true;
	}
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("already exists at path");
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureNoFileConflict(
	virtualPath: string,
	providerId: string,
	excludingFileId?: string,
) {
	const db = getDb();
	const [existing] = await db
		.select({ id: files.id })
		.from(files)
		.where(
			and(
				eq(files.nodeType, "file"),
				eq(files.virtualPath, virtualPath),
				eq(files.providerId, providerId),
				eq(files.isDeleted, false),
			),
		)
		.limit(1);

	if (existing && existing.id !== excludingFileId) {
		throw new ConflictError(`File already exists at path: ${virtualPath}`);
	}
}

async function getTargetFolder(
	workspaceId: string,
	targetFolderId: string | null,
) {
	if (!targetFolderId) return null;
	const db = getDb();
	const [folder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, targetFolderId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.limit(1);
	return folder ?? null;
}

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

		const [file] = await db
			.select()
			.from(files)
			.where(eq(files.id, fileId))
			.limit(1);

		if (!file || file.isDeleted || file.nodeType !== "file") {
			await activityService.fail(jobId, "File not found");
			return;
		}

		const folder = await getTargetFolder(workspaceId, targetFolderId ?? null);
		if (folder && folder.providerId !== targetProviderId) {
			throw new Error("Target folder does not belong to target provider");
		}

		const destinationPath = joinPath(folder?.virtualPath ?? "/", file.name);
		logger.debug({
			msg: "[transfer:file] resolved destination",
			jobId,
			fileId,
			sourceProviderId: file.providerId,
			targetProviderId,
			sourcePath: file.virtualPath,
			destinationPath,
			targetFolderId: folder?.id ?? null,
			operation,
		});
		await ensureNoFileConflict(
			destinationPath,
			targetProviderId,
			operation === "cut" ? file.id : undefined,
		);

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
			} satisfies TransferManifest);

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
					name: file.name,
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
				name: file.name,
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
				destinationPath,
			});

			// Update DB first so the record points to the destination.
			// If the subsequent source deletion fails the file is duplicated
			// (exists on both providers) rather than lost — a safe fallback
			// that can be cleaned up later.
			const sourceRemoteId = file.remoteId;
			const sourceProviderId = file.providerId;

			const [updated] = await db
				.update(files)
				.set({
					providerId: targetProviderId,
					remoteId: finalRemoteId,
					folderId: folder?.id ?? null,
					virtualPath: destinationPath,
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
				// Source deletion failed — the file now exists on both providers.
				// Log a warning but do NOT re-throw; the transfer itself succeeded
				// and the DB record already points to the destination.
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
				destinationPath,
			});
		} else {
			const [inserted] = await db
				.insert(files)
				.values({
					nodeType: "file",
					virtualPath: destinationPath,
					name: file.name,
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
				destinationPath,
			});
		}

		await activityService.complete(jobId, "Transfer completed");
		await activityService.log({
			kind: "file.transfer.completed",
			title: "Provider transfer completed",
			summary: file.name,
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

async function markFolderSubtreeDeleted(
	workspaceId: string,
	providerId: string,
	rootVirtualPath: string,
) {
	const db = getDb();
	const prefix = `${rootVirtualPath}/%`;
	await db
		.update(files)
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(
			and(
				eq(files.workspaceId, workspaceId),
				eq(files.providerId, providerId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				like(files.virtualPath, prefix),
			),
		);

	await db
		.update(folders)
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(
			and(
				eq(folders.workspaceId, workspaceId),
				eq(folders.providerId, providerId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				like(folders.virtualPath, `${rootVirtualPath}/%`),
			),
		);

	await db
		.update(folders)
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(
			and(
				eq(folders.workspaceId, workspaceId),
				eq(folders.providerId, providerId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				eq(folders.virtualPath, rootVirtualPath),
			),
		);
}

export async function handleFolderTransfer(
	ctx: JobContext,
	data: ProviderFolderTransferJobData,
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

	let sourceProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;
	let targetProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;

	try {
		await updateActivity({
			status: "running",
			progress: 0,
			message: "Preparing folder transfer",
			metadata: {
				phase: "prepare",
				entity: "folder",
				operation: data.operation,
			},
		});

		const [sourceFolder] = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.id, data.folderId),
					eq(folders.nodeType, "folder"),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
				),
			)
			.limit(1);

		if (!sourceFolder) {
			await activityService.fail(jobId, "Folder not found");
			return;
		}
		logger.debug({
			msg: "[transfer:folder] starting",
			jobId,
			folderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			sourcePath: sourceFolder.virtualPath,
			targetFolderId: data.targetFolderId ?? null,
			operation: data.operation,
			parentJobId: data.parentJobId ?? null,
		});

		const targetFolder = await getTargetFolder(
			workspaceId,
			data.targetFolderId ?? null,
		);
		if (
			targetFolder &&
			(targetFolder.id === sourceFolder.id ||
				targetFolder.virtualPath.startsWith(`${sourceFolder.virtualPath}/`))
		) {
			await activityService.fail(
				jobId,
				"Cannot paste a folder into itself or a descendant folder",
			);
			return;
		}

		const targetProviderId = targetFolder
			? targetFolder.providerId
			: sourceFolder.providerId;
		const destinationPath = joinPath(
			targetFolder?.virtualPath ?? "/",
			sourceFolder.name,
		);
		logger.debug({
			msg: "[transfer:folder] resolved destination",
			jobId,
			folderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			targetProviderId,
			destinationPath,
			targetFolderId: targetFolder?.id ?? null,
			operation: data.operation,
		});

		// Fast path: move same-provider folders synchronously for cut.
		if (
			data.operation === "cut" &&
			targetProviderId === sourceFolder.providerId
		) {
			logger.debug({
				msg: "[transfer:folder] using same-provider move",
				jobId,
				folderId: sourceFolder.id,
				targetFolderId: targetFolder?.id ?? null,
			});
			await moveFolder(
				db,
				sourceFolder.id,
				userId,
				workspaceId,
				targetFolder?.id ?? undefined,
			);
			await activityService.complete(jobId, "Transfer completed");
			return;
		}

		const sourceRecord = await providerService.getProvider(
			sourceFolder.providerId,
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

		const folderPrefix = `${sourceFolder.virtualPath}/`;
		const sourceSubfolders = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.workspaceId, workspaceId),
					eq(folders.providerId, sourceFolder.providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.isDeleted, false),
					like(folders.virtualPath, `${sourceFolder.virtualPath}/%`),
				),
			)
			.orderBy(folders.virtualPath);
		sourceSubfolders.unshift(sourceFolder);

		const sourceSubfiles = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.workspaceId, workspaceId),
					eq(files.providerId, sourceFolder.providerId),
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					like(files.virtualPath, `${folderPrefix}%`),
				),
			)
			.orderBy(files.virtualPath);
		logger.debug({
			msg: "[transfer:folder] loaded subtree",
			jobId,
			folderId: sourceFolder.id,
			subfolderCount: sourceSubfolders.length,
			subfileCount: sourceSubfiles.length,
		});

		const sourceFolderById = new Map(
			sourceSubfolders.map((folder) => [folder.id, folder]),
		);
		const destinationBySourceId = new Map<string, Folder>();

		// Reuse existing destination folder if it was created by a previous
		// (failed) attempt, so retries don't hit a ConflictError.
		const [existingRoot] = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.nodeType, "folder"),
					eq(folders.providerId, targetProviderId),
					eq(folders.virtualPath, destinationPath),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
				),
			)
			.limit(1);

		let rootFolder: Folder;
		if (existingRoot) {
			logger.debug({
				msg: "[transfer:folder] reusing existing destination root",
				jobId,
				existingFolderId: existingRoot.id,
				destinationPath,
			});
			rootFolder = existingRoot;
		} else {
			const rootRemoteId = await targetProvider.createFolder({
				name: sourceFolder.name,
				parentId: targetFolder?.remoteId,
			});
			const [newRoot] = await db
				.insert(folders)
				.values({
					nodeType: "folder",
					virtualPath: destinationPath,
					name: sourceFolder.name,
					remoteId: rootRemoteId,
					providerId: targetProviderId,
					workspaceId,
					parentId: targetFolder?.id ?? null,
					createdBy: userId,
					isDeleted: false,
				})
				.returning();
			if (!newRoot) {
				throw new Error("Failed to create destination folder");
			}
			rootFolder = newRoot;
		}
		destinationBySourceId.set(sourceFolder.id, rootFolder);

		const descendants = sourceSubfolders
			.filter((folder) => folder.id !== sourceFolder.id)
			.sort((a, b) => a.virtualPath.length - b.virtualPath.length);
		for (const sourceDescendant of descendants) {
			await assertNotCancelled();
			const sourceParent = sourceDescendant.parentId
				? sourceFolderById.get(sourceDescendant.parentId)
				: undefined;
			const destinationParent =
				(sourceParent && destinationBySourceId.get(sourceParent.id)) ??
				rootFolder;
			const destinationVirtualPath = joinPath(
				destinationParent.virtualPath,
				sourceDescendant.name,
			);

			// Reuse existing descendant folder from a previous attempt.
			const [existingDescendant] = await db
				.select()
				.from(folders)
				.where(
					and(
						eq(folders.nodeType, "folder"),
						eq(folders.providerId, targetProviderId),
						eq(folders.virtualPath, destinationVirtualPath),
						eq(folders.workspaceId, workspaceId),
						eq(folders.isDeleted, false),
					),
				)
				.limit(1);

			if (existingDescendant) {
				destinationBySourceId.set(sourceDescendant.id, existingDescendant);
				continue;
			}

			const remoteId = await targetProvider.createFolder({
				name: sourceDescendant.name,
				parentId: destinationParent.remoteId,
			});
			const [inserted] = await db
				.insert(folders)
				.values({
					nodeType: "folder",
					virtualPath: destinationVirtualPath,
					name: sourceDescendant.name,
					remoteId,
					providerId: targetProviderId,
					workspaceId,
					parentId: destinationParent.id,
					createdBy: userId,
					isDeleted: false,
				})
				.returning();
			if (!inserted) {
				throw new Error("Failed to create destination descendant folder");
			}
			destinationBySourceId.set(sourceDescendant.id, inserted);
		}

		await updateActivity({
			progress: 0.25,
			message: "Queued nested file transfers",
			metadata: {
				phase: "queue_children",
				entity: "folder",
				operation: data.operation,
				totalFiles: sourceSubfiles.length,
			},
		});

		const childJobIds: string[] = [];
		const childFileOperation: ProviderFileTransferJobData["operation"] =
			data.operation === "cut" ? "cut" : "copy";
		for (const sourceFile of sourceSubfiles) {
			await assertNotCancelled();
			const sourceParentFolder = sourceFile.folderId
				? destinationBySourceId.get(sourceFile.folderId)
				: rootFolder;
			const destinationFolderId = sourceParentFolder?.id ?? rootFolder.id;
			const enqueued = await enqueueProviderTransfer(activityService, {
				entity: "file",
				operation: childFileOperation,
				workspaceId,
				userId,
				parentJobId: jobId,
				fileId: sourceFile.id,
				targetProviderId,
				targetFolderId: destinationFolderId,
				title: `Transfer ${sourceFile.name}`,
				message: "Queued from folder transfer",
				metadata: {
					fileId: sourceFile.id,
					fileName: sourceFile.name,
					sourceProviderId: sourceFolder.providerId,
					targetProviderId,
					targetFolderId: destinationFolderId,
					parentJobId: jobId,
				},
			});
			childJobIds.push(enqueued.activityJob.id);
			logger.debug({
				msg: "[transfer:folder] child file job queued",
				jobId,
				folderId: sourceFolder.id,
				childJobId: enqueued.activityJob.id,
				fileId: sourceFile.id,
				filePath: sourceFile.virtualPath,
				targetFolderId: destinationFolderId,
				operation: childFileOperation,
			});
		}

		await updateActivity({
			progress: sourceSubfiles.length === 0 ? 0.9 : 0.4,
			message:
				sourceSubfiles.length === 0
					? "No files in folder, finalizing"
					: "Waiting for nested file transfers",
			metadata: {
				phase: "children_running",
				entity: "folder",
				operation: data.operation,
				childJobIds,
				totalFiles: sourceSubfiles.length,
			},
		});

		if (childJobIds.length > 0) {
			while (true) {
				await assertNotCancelled();
				const childRows = await db
					.select({ id: jobs.id, status: jobs.status })
					.from(jobs)
					.where(inArray(jobs.id, childJobIds));
				if (childRows.length < childJobIds.length) {
					await sleep(1000);
					continue;
				}
				const hasActive = childRows.some(
					(row) => row.status === "pending" || row.status === "running",
				);
				if (hasActive) {
					await sleep(1000);
					continue;
				}
				const hasFailure = childRows.some((row) => row.status === "error");
				if (hasFailure) {
					logger.error({
						msg: "[transfer:folder] child file transfers failed",
						jobId,
						folderId: sourceFolder.id,
						childJobIds,
					});
					await activityService.fail(
						jobId,
						"One or more nested file transfers failed",
					);
					return;
				}
				break;
			}
		}
		logger.debug({
			msg: "[transfer:folder] all child file jobs completed",
			jobId,
			folderId: sourceFolder.id,
			childCount: childJobIds.length,
			operation: data.operation,
		});

		if (data.operation === "cut") {
			logger.debug({
				msg: "[transfer:folder] finalizing cut",
				jobId,
				folderId: sourceFolder.id,
				sourceRemoteId: sourceFolder.remoteId,
				sourcePath: sourceFolder.virtualPath,
			});

			// Mark DB records as deleted first so the source subtree is no
			// longer visible.  If the subsequent provider deletion fails the
			// remote files remain as orphans (safe) rather than the DB
			// pointing to already-deleted provider objects (data loss).
			await markFolderSubtreeDeleted(
				workspaceId,
				sourceFolder.providerId,
				sourceFolder.virtualPath,
			);

			try {
				await sourceProvider.delete({
					remoteId: sourceFolder.remoteId,
					isFolder: true,
				});
			} catch (deleteError) {
				logger.warn({
					msg: "[transfer:folder] source folder deletion failed after DB update; remote orphan remains",
					jobId,
					folderId: sourceFolder.id,
					sourceRemoteId: sourceFolder.remoteId,
					sourcePath: sourceFolder.virtualPath,
					error:
						deleteError instanceof Error
							? deleteError.message
							: String(deleteError),
				});
			}

			logger.debug({
				msg: "[transfer:folder] source subtree marked deleted",
				jobId,
				folderId: sourceFolder.id,
				sourcePath: sourceFolder.virtualPath,
			});
		}

		await activityService.complete(jobId, "Transfer completed");
	} finally {
		if (sourceProvider) {
			await sourceProvider.cleanup().catch(() => {});
		}
		if (targetProvider) {
			await targetProvider.cleanup().catch(() => {});
		}
	}
}

export function createTransferWorker(): Worker<ProviderTransferJobData> {
	const worker = new Worker<ProviderTransferJobData>(
		"provider-transfers",
		async (bullJob) => {
			const db = getDb();
			const activityService = new ActivityService(db);
			const providerService = new ProviderService(db);
			const data = normalizeJobData(bullJob.data);
			const { jobId, workspaceId, userId } = data;

			logger.debug({
				msg: "[transfer] job started",
				jobId,
				entity: data.entity,
				attempt: bullJob.attemptsMade + 1,
			});

			const assertNotCancelled = () => assertJobNotCancelled(jobId);
			const updateActivity = async (input: {
				progress?: number;
				message?: string;
				status?: "pending" | "running" | "completed" | "error";
				metadata?: Record<string, unknown>;
			}) => {
				await assertNotCancelled();
				await activityService.update(jobId, input);
			};

			try {
				const ctx: JobContext = {
					activityService,
					providerService,
					jobId,
					workspaceId,
					userId,
					assertNotCancelled,
					updateActivity,
				};
				if (isFileTransferJobData(data)) {
					await handleFileTransfer(ctx, data);
				} else {
					await handleFolderTransfer(ctx, data);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (error instanceof JobCancelledError) {
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
				const nonRetryable = isNonRetryableTransferError(error);
				const currentAttempt = bullJob.attemptsMade + 1;
				const maxAttempts =
					typeof bullJob.opts.attempts === "number" ? bullJob.opts.attempts : 1;
				const willRetry = !nonRetryable && currentAttempt < maxAttempts;

				logger.error({
					msg: "Provider transfer job failed",
					jobId,
					error: message,
					retryAttempt: currentAttempt,
					retryMax: maxAttempts,
					willRetry,
					nonRetryable,
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
						message: nonRetryable
							? `Transfer failed: ${message}`
							: `Transfer failed after ${currentAttempt}/${maxAttempts} attempts`,
						metadata: {
							phase: "failed",
							error: message,
							retryAttempt: currentAttempt,
							retryMax: maxAttempts,
							willRetry: false,
							nonRetryable,
						},
					});
				}
				if (nonRetryable) {
					bullJob.discard();
				}
				throw error;
			} finally {
				await clearJobCancellation(jobId);
			}
		},
		{
			connection: createBullMQConnection(),
			concurrency: 2,
		},
	);

	worker.on("failed", (job, error) => {
		logger.error({
			msg: "Transfer worker failed",
			jobId: job?.id,
			error: error.message,
		});
	});

	return worker;
}
