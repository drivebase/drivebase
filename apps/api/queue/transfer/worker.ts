import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import {
	ConflictError,
	getParentPath,
	joinPath,
	normalizePath,
} from "@drivebase/core";
import {
	type Folder,
	files,
	folders,
	getDb,
	type Job,
	jobs,
	storageProviders,
} from "@drivebase/db";
import { Worker } from "bullmq";
import { and, eq, inArray, isNull, like, or } from "drizzle-orm";
import { env } from "@/config/env";
import { enqueueProviderTransfer } from "@/queue/transfer/enqueue";
import {
	isBatchTransferJobData,
	isFileTransferJobData,
	isRootTransferJobData,
	type ProviderBatchTransferJobData,
	type ProviderFileTransferJobData,
	type ProviderFolderTransferJobData,
	type ProviderRootTransferJobData,
	type ProviderTransferJobData,
} from "@/queue/transfer/queue";
import { createBullMQConnection } from "@/redis/client";
import { ActivityService } from "@/service/activity";
import { getFile } from "@/service/file/query/file-read";
import { moveFolder } from "@/service/folder/mutation";
import { ProviderService } from "@/service/provider";
import {
	getTransferSessionById,
	type TransferConflictAction,
	type TransferFileEntry,
	type TransferFolderEntry,
	type TransferManifest,
	type TransferSourceItem,
	type TransferRootEntry,
	updateTransferSession,
} from "@/service/file/transfer/transfer-session";
import {
	assertNotCancelled as assertJobNotCancelled,
	clearJobCancellation,
	JobCancelledError,
} from "@/utils/jobs/job-cancel";
import { waitForJobResolution } from "@/utils/jobs/job-pause";
import { logger } from "@/utils/runtime/logger";

const DEFAULT_TRANSFER_CHUNK_SIZE = 8 * 1024 * 1024;

interface FileTransferCacheManifest {
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
		status?: Job["status"];
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

async function readManifest(
	path: string,
): Promise<FileTransferCacheManifest | null> {
	try {
		const content = await readFile(path, "utf-8");
		return JSON.parse(content) as FileTransferCacheManifest;
	} catch {
		return null;
	}
}

async function writeManifest(
	path: string,
	manifest: FileTransferCacheManifest,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(manifest, null, 2), "utf-8");
}

function normalizeJobData(data: unknown): ProviderTransferJobData {
	const legacy = data as {
		entity?: "transfer" | "file" | "folder";
		targetFolderId?: string | null;
		operation?: "cut" | "copy";
		fileId?: string;
		targetProviderId?: string;
		folderId?: string;
		transferSessionId?: string;
		jobId: string;
		workspaceId: string;
		userId: string;
		parentJobId?: string;
	};
	if (legacy.entity === "transfer") {
		if (!legacy.transferSessionId || !legacy.operation) {
			throw new Error("Invalid transfer session payload");
		}
		return {
			entity: "transfer",
			jobId: legacy.jobId,
			workspaceId: legacy.workspaceId,
			userId: legacy.userId,
			transferSessionId: legacy.transferSessionId,
			operation: legacy.operation,
			parentJobId: legacy.parentJobId,
		};
	}
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
	if (legacy.entity === "batch") {
		const batchLegacy = data as {
			entity: "batch";
			childJobIds?: string[];
			operation?: "cut" | "copy";
			jobId: string;
			workspaceId: string;
			userId: string;
			parentJobId?: string;
			sourceFolders?: Array<{
				id: string;
				providerId: string;
				virtualPath: string;
				remoteId: string;
			}>;
		};
		if (!batchLegacy.childJobIds || !batchLegacy.operation) {
			throw new Error("Invalid batch transfer payload");
		}
		return {
			entity: "batch",
			jobId: batchLegacy.jobId,
			workspaceId: batchLegacy.workspaceId,
			userId: batchLegacy.userId,
			childJobIds: batchLegacy.childJobIds,
			operation: batchLegacy.operation,
			parentJobId: batchLegacy.parentJobId,
			sourceFolders: batchLegacy.sourceFolders,
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
	return (
		message.includes("already exists at path") ||
		message.startsWith("Invalid transfer")
	);
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkFileConflict(
	virtualPath: string,
	providerId: string,
	excludingFileId?: string,
) {
	const db = getDb();
	const [existing] = await db
		.select()
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
		return existing;
	}
	return null;
}

async function getUniqueFilename(
	virtualPath: string,
	providerId: string,
): Promise<{ name: string; path: string }> {
	const db = getDb();
	const parentPath = getParentPath(virtualPath);
	const name = basename(virtualPath);
	const ext = extname(name);
	const baseName = basename(name, ext);

	let counter = 1;
	let currentName = name;
	let currentPath = virtualPath;

	while (true) {
		const [existing] = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.virtualPath, currentPath),
					eq(files.providerId, providerId),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (!existing) {
			return { name: currentName, path: currentPath };
		}

		currentName = `${baseName} (${counter})${ext}`;
		currentPath = joinPath(parentPath, currentName);
		counter++;
	}
}

async function checkFolderConflict(
	virtualPath: string,
	providerId: string,
): Promise<Folder | null> {
	const db = getDb();
	const [existing] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.nodeType, "folder"),
				eq(folders.virtualPath, virtualPath),
				eq(folders.providerId, providerId),
				eq(folders.isDeleted, false),
			),
		)
		.limit(1);

	return existing ?? null;
}

async function getUniqueFolderName(
	virtualPath: string,
	providerId: string,
): Promise<{ name: string; path: string }> {
	const parentPath = getParentPath(virtualPath);
	const name = basename(virtualPath);

	let counter = 1;
	let currentName = `${name} (${counter})`;
	let currentPath = joinPath(parentPath, currentName);

	while (true) {
		const existing = await checkFolderConflict(currentPath, providerId);
		if (!existing) {
			return { name: currentName, path: currentPath };
		}
		counter += 1;
		currentName = `${name} (${counter})`;
		currentPath = joinPath(parentPath, currentName);
	}
}

function getRelativePath(rootPath: string, value: string): string {
	const normalizedRoot = normalizePath(rootPath);
	const normalizedValue = normalizePath(value);

	if (normalizedValue === normalizedRoot) {
		return "";
	}
	if (normalizedRoot === "/") {
		return normalizedValue.slice(1);
	}
	const prefix = `${normalizedRoot}/`;
	return normalizedValue.startsWith(prefix)
		? normalizedValue.slice(prefix.length)
		: normalizedValue;
}

function syncManifestCounts(manifest: TransferManifest): TransferManifest {
	const completedFiles = manifest.files.filter(
		(file) => file.status === "completed",
	).length;
	const failedFiles = manifest.files.filter(
		(file) => file.status === "failed",
	).length;
	const skippedFiles = manifest.files.filter(
		(file) => file.status === "skipped",
	).length;

	return {
		...manifest,
		completedFiles,
		failedFiles,
		skippedFiles,
		totalFiles: manifest.files.length,
	};
}

function getTransferCompletionMessage(manifest: TransferManifest): string {
	const parts = [`${manifest.completedFiles} transferred`];

	if (manifest.skippedFiles > 0) {
		parts.push(`${manifest.skippedFiles} skipped`);
	}
	if (manifest.failedFiles > 0) {
		parts.push(`${manifest.failedFiles} failed`);
	}
	if (manifest.hiddenFiles > 0) {
		parts.push(`${manifest.hiddenFiles} hidden`);
	}

	return parts.join(", ");
}

async function buildTransferManifest(
	userId: string,
	workspaceId: string,
	sourceItems: TransferSourceItem[],
	targetFolderId: string | null,
	targetProviderId: string,
): Promise<TransferManifest> {
	const db = getDb();
	const roots: TransferRootEntry[] = [];
	const foldersForManifest: TransferFolderEntry[] = [];
	const filesForManifest: TransferFileEntry[] = [];

	for (const sourceItem of sourceItems) {
		if (sourceItem.kind === "file") {
			const file = await getFile(db, sourceItem.id, userId, workspaceId);

			filesForManifest.push({
				id: `file:${file.id}`,
				sourceFileId: file.id,
				sourceProviderId: file.providerId,
				sourceVirtualPath: file.virtualPath,
				sourceRootId: null,
				name: file.name,
				relativeDirPath: "",
				status: "pending",
				isHidden: file.name.startsWith("."),
			});
			continue;
		}

		const [sourceFolderRow] = await db
			.select()
			.from(folders)
			.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
			.where(
				and(
					eq(folders.id, sourceItem.id),
					eq(folders.nodeType, "folder"),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(1);
		const sourceFolder = sourceFolderRow?.nodes ?? null;

		if (!sourceFolder) {
			throw new Error(`Source folder not found: ${sourceItem.id}`);
		}

		const rootId = `root:${sourceFolder.id}`;
		roots.push({
			id: rootId,
			kind: "folder",
			sourceFolderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			sourceVirtualPath: sourceFolder.virtualPath,
			sourceRemoteId: sourceFolder.remoteId,
			originalName: sourceFolder.name,
			resolvedName: sourceFolder.name,
			status: "pending",
		});

		foldersForManifest.push({
			id: `folder:${sourceFolder.id}`,
			sourceFolderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			sourceVirtualPath: sourceFolder.virtualPath,
			sourceRootId: rootId,
			name: sourceFolder.name,
			relativePath: "",
			status: "pending",
		});

		const descendantFolders = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.providerId, sourceFolder.providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.isDeleted, false),
					like(folders.virtualPath, `${sourceFolder.virtualPath}/%`),
				),
			)
			.orderBy(folders.virtualPath);

		const folderRelativePathById = new Map<string, string>([
			[sourceFolder.id, ""],
		]);
		for (const descendantFolder of descendantFolders) {
			const relativePath = getRelativePath(
				sourceFolder.virtualPath,
				descendantFolder.virtualPath,
			);
			folderRelativePathById.set(descendantFolder.id, relativePath);
			foldersForManifest.push({
				id: `folder:${descendantFolder.id}`,
				sourceFolderId: descendantFolder.id,
				sourceProviderId: descendantFolder.providerId,
				sourceVirtualPath: descendantFolder.virtualPath,
				sourceRootId: rootId,
				name: descendantFolder.name,
				relativePath,
				status: "pending",
			});
		}

		const subtreeFolderIds = [
			sourceFolder.id,
			...descendantFolders.map((folder) => folder.id),
		];
		const descendantFiles = await db
			.select({
				id: files.id,
				name: files.name,
				virtualPath: files.virtualPath,
				providerId: files.providerId,
				folderId: files.folderId,
			})
			.from(files)
			.where(
				and(
					eq(files.providerId, sourceFolder.providerId),
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					or(
						inArray(files.folderId, subtreeFolderIds),
						like(files.virtualPath, `${sourceFolder.virtualPath}/%`),
					),
				),
			)
			.orderBy(files.virtualPath);

		for (const descendantFile of descendantFiles) {
			const relativeDirPath = descendantFile.folderId
				? (folderRelativePathById.get(descendantFile.folderId) ?? "")
				: getRelativePath(
						sourceFolder.virtualPath,
						getParentPath(descendantFile.virtualPath),
					);

			filesForManifest.push({
				id: `file:${descendantFile.id}`,
				sourceFileId: descendantFile.id,
				sourceProviderId: descendantFile.providerId,
				sourceVirtualPath: descendantFile.virtualPath,
				sourceRootId: rootId,
				name: descendantFile.name,
				relativeDirPath,
				status: "pending",
				isHidden: descendantFile.name.startsWith("."),
			});
		}
	}

	const hiddenFiles = filesForManifest.filter((file) => file.isHidden).length;

	return syncManifestCounts({
		targetFolderId,
		targetProviderId,
		roots,
		folders: foldersForManifest,
		files: filesForManifest,
		preflightComplete: false,
		completedFiles: 0,
		failedFiles: 0,
		skippedFiles: 0,
		totalFiles: filesForManifest.length,
		hiddenFiles,
		currentConflict: null,
	});
}

async function getTargetFolder(
	workspaceId: string,
	targetFolderId: string | null,
) {
	if (!targetFolderId) return null;
	const db = getDb();
	const [folderRow] = await db
		.select()
		.from(folders)
		.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
		.where(
			and(
				eq(folders.id, targetFolderId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);
	return folderRow?.nodes ?? null;
}

export async function handleRootTransfer(
	ctx: JobContext,
	data: ProviderRootTransferJobData,
) {
	const db = getDb();
	const {
		activityService,
		providerService,
		jobId,
		workspaceId,
		userId,
		assertNotCancelled,
	} = ctx;

	const session = await getTransferSessionById(db, data.transferSessionId);
	if (!session) {
		await activityService.fail(jobId, "Transfer session not found");
		return;
	}

	let manifest = session.manifestData;
	let targetProvider: Awaited<
		ReturnType<ProviderService["getProviderInstance"]>
	> | null = null;
	const sourceProviders = new Map<
		string,
		Awaited<ReturnType<ProviderService["getProviderInstance"]>>
	>();

	const persistManifest = async (
		nextManifest: TransferManifest,
		status: typeof session.status,
	) => {
		manifest = syncManifestCounts(nextManifest);
		await updateTransferSession(db, session.id, {
			status,
			manifest,
		});
		return manifest;
	};

	const updateTransferJob = async (input: {
		status?: Job["status"];
		message: string;
		progress: number;
		metadata?: Record<string, unknown>;
	}) => {
		await assertNotCancelled();
		await activityService.update(jobId, {
			...input,
			metadata: {
				entity: "transfer",
				operation: data.operation,
				totalFiles: manifest?.totalFiles ?? 0,
				completedFiles: manifest?.completedFiles ?? 0,
				failedFiles: manifest?.failedFiles ?? 0,
				skippedFiles: manifest?.skippedFiles ?? 0,
				...(manifest?.hiddenFiles ? { hiddenFiles: manifest.hiddenFiles } : {}),
				...(input.metadata ?? {}),
			},
		});
	};

	const requireManifest = (): TransferManifest => {
		if (!manifest) {
			throw new Error("Transfer manifest not initialized");
		}
		return manifest;
	};

	const getSourceProvider = async (providerId: string) => {
		let provider = sourceProviders.get(providerId);
		if (!provider) {
			const record = await providerService.getProvider(
				providerId,
				userId,
				workspaceId,
			);
			provider = await providerService.getProviderInstance(record);
			sourceProviders.set(providerId, provider);
		}
		return provider;
	};

	const getRootById = (rootId: string | null) => {
		if (!rootId) return null;
		return requireManifest().roots.find((root) => root.id === rootId) ?? null;
	};

	const markRootSkipped = (rootId: string) => {
		const transferManifest = requireManifest();
		for (const root of transferManifest.roots) {
			if (root.id === rootId) {
				root.status = "skipped";
			}
		}
		for (const folder of transferManifest.folders) {
			if (folder.sourceRootId === rootId) {
				folder.status = "skipped";
			}
		}
		for (const file of transferManifest.files) {
			if (file.sourceRootId === rootId && file.status === "pending") {
				file.status = "skipped";
			}
		}
	};

	const waitForConflictResolution = async (
		conflict: TransferManifest["currentConflict"],
		message: string,
	) => {
		if (!conflict) {
			throw new Error("Missing transfer manifest conflict state");
		}
		const transferManifest = requireManifest();

		transferManifest.currentConflict = conflict;
		await persistManifest(transferManifest, "paused");
		await updateTransferJob({
			status: "paused",
			message,
			progress:
				transferManifest.totalFiles === 0
					? 0
					: (transferManifest.completedFiles +
							transferManifest.failedFiles +
							transferManifest.skippedFiles) /
						transferManifest.totalFiles,
			metadata: {
				phase: "conflict",
				conflictKind: conflict.kind,
				currentPath: conflict.currentPath,
				allowedResolutions: conflict.allowedResolutions,
				allowApplyToAll: conflict.kind === "file",
			},
		});

		const resolution = await waitForJobResolution<{
			action: TransferConflictAction;
			applyToAll?: boolean;
		}>(jobId);

		if (!conflict.allowedResolutions.includes(resolution.action)) {
			throw new Error(`Unsupported conflict resolution: ${resolution.action}`);
		}

		if (conflict.kind === "file" && resolution.applyToAll) {
			transferManifest.applyToAllFileResolution = resolution.action;
		}
		transferManifest.currentConflict = null;
		await persistManifest(transferManifest, "running");

		return resolution;
	};

	const buildFileProgress = (
		_fileEntry: TransferFileEntry,
		fileProgress = 0,
	): number => {
		const transferManifest = manifest;
		if (!transferManifest || transferManifest.totalFiles === 0) {
			return 0.95;
		}
		const processed =
			transferManifest.completedFiles +
			transferManifest.failedFiles +
			transferManifest.skippedFiles;
		return Math.min(
			(processed + fileProgress) / transferManifest.totalFiles,
			0.99,
		);
	};

	const getCurrentFilePosition = (): {
		current: number;
		total: number;
	} => {
		const transferManifest = requireManifest();
		const total = Math.max(transferManifest.totalFiles, 1);
		const processed =
			transferManifest.completedFiles +
			transferManifest.failedFiles +
			transferManifest.skippedFiles;

		return {
			current: Math.min(processed + 1, total),
			total,
		};
	};

	const buildFileTransferMessage = (verb: string, fileName: string): string => {
		const { current, total } = getCurrentFilePosition();
		return `${verb} ${current} of ${total} files — ${fileName}`;
	};

	const reportFileProgress = async (
		fileEntry: TransferFileEntry,
		fileProgress: number,
		message: string,
	) => {
		await updateTransferJob({
			status: "running",
			message,
			progress: buildFileProgress(fileEntry, fileProgress),
			metadata: {
				phase: "transfer",
				currentPath: fileEntry.sourceVirtualPath,
			},
		});
	};

	try {
		if (!manifest) {
			await updateTransferJob({
				status: "running",
				message: "Scanning source",
				progress: 0.01,
				metadata: { phase: "scan" },
			});
			manifest = await buildTransferManifest(
				userId,
				workspaceId,
				session.sourceItemsData,
				session.targetFolderId ?? null,
				session.targetProviderId ?? "",
			);
			await persistManifest(manifest, "scanning");
		}

		const transferManifest = requireManifest();
		const targetFolder = await getTargetFolder(
			workspaceId,
			transferManifest.targetFolderId ?? null,
		);
		const targetProviderId =
			transferManifest.targetProviderId || targetFolder?.providerId;
		if (!targetProviderId) {
			throw new Error("Target provider not resolved for transfer");
		}
		transferManifest.targetProviderId = targetProviderId;

		if (targetFolder && targetFolder.providerId !== targetProviderId) {
			throw new Error("Target folder does not belong to target provider");
		}

		const targetRecord = await providerService.getProvider(
			targetProviderId,
			userId,
			workspaceId,
		);
		targetProvider = await providerService.getProviderInstance(targetRecord);
		const resolvedTargetProvider = targetProvider;

		if (!transferManifest.preflightComplete) {
			for (const root of transferManifest.roots) {
				if (root.status === "skipped") continue;

				const destinationPath = joinPath(
					targetFolder?.virtualPath ?? "/",
					root.resolvedName,
				);
				const existing = await checkFolderConflict(
					destinationPath,
					targetProviderId,
				);
				if (!existing) {
					continue;
				}

				const resolution = await waitForConflictResolution(
					{
						kind: "folder-root",
						currentPath: destinationPath,
						rootId: root.id,
						fileName: root.resolvedName,
						allowedResolutions: ["duplicate", "skip"],
					},
					`Folder '${root.resolvedName}' already exists`,
				);

				if (resolution.action === "skip") {
					markRootSkipped(root.id);
					continue;
				}

				const unique = await getUniqueFolderName(
					destinationPath,
					targetProviderId,
				);
				root.resolvedName = unique.name;
			}

			transferManifest.preflightComplete = true;
			await persistManifest(transferManifest, "running");
		}

		const folderCache = new Map<string, Folder | null>();
		folderCache.set(targetFolder?.virtualPath ?? "/", targetFolder ?? null);

		const ensureFolderChain = async (
			root: TransferRootEntry | null,
			relativePath: string,
		): Promise<Folder | null> => {
			let currentFolder = targetFolder ?? null;
			let currentPath = targetFolder?.virtualPath ?? "/";
			const segments: string[] = [];

			if (root) {
				segments.push(root.resolvedName);
			}
			if (relativePath) {
				segments.push(...relativePath.split("/").filter(Boolean));
			}

			for (const segment of segments) {
				currentPath = joinPath(currentPath, segment);
				if (folderCache.has(currentPath)) {
					currentFolder = folderCache.get(currentPath) ?? null;
					continue;
				}

				const existing = await checkFolderConflict(
					currentPath,
					targetProviderId,
				);
				if (existing) {
					currentFolder = existing;
					folderCache.set(currentPath, existing);
					continue;
				}

				const remoteId = await resolvedTargetProvider.createFolder({
					name: segment,
					...(currentFolder?.remoteId
						? { parentId: currentFolder.remoteId }
						: {}),
				});
				const [createdFolder] = await db
					.insert(folders)
					.values({
						nodeType: "folder",
						virtualPath: currentPath,
						name: segment,
						remoteId,
						providerId: targetProviderId,
						workspaceId,
						parentId: currentFolder?.id ?? null,
						createdBy: userId,
						isDeleted: false,
					})
					.returning();

				if (!createdFolder) {
					throw new Error(`Failed to create folder at ${currentPath}`);
				}

				currentFolder = createdFolder;
				folderCache.set(currentPath, createdFolder);
			}

			return currentFolder;
		};

		for (const folderEntry of [...requireManifest().folders].sort(
			(a, b) => a.relativePath.length - b.relativePath.length,
		)) {
			if (folderEntry.status !== "pending") continue;
			const root = getRootById(folderEntry.sourceRootId);
			if (!root || root.status === "skipped") {
				folderEntry.status = "skipped";
				continue;
			}

			await assertNotCancelled();
			await ensureFolderChain(root, folderEntry.relativePath);
			folderEntry.status = "completed";
		}
		await persistManifest(requireManifest(), "running");

		const executeFileTransfer = async (
			fileEntry: TransferFileEntry,
			destinationFolder: Folder | null,
		) => {
			let file: Awaited<ReturnType<typeof getFile>>;
			try {
				file = await getFile(db, fileEntry.sourceFileId, userId, workspaceId);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(
					`Source file not found: ${fileEntry.sourceFileId} (${message})`,
				);
			}

			const destinationPath = joinPath(
				destinationFolder?.virtualPath ?? "/",
				fileEntry.name,
			);
			let finalDestinationPath = destinationPath;
			let finalFileName = fileEntry.name;

			const existingConflict = await checkFileConflict(
				destinationPath,
				targetProviderId,
				data.operation === "cut" ? file.id : undefined,
			);

			if (existingConflict) {
				const transferManifest = requireManifest();
				let resolution = transferManifest.applyToAllFileResolution ?? null;

				if (!resolution) {
					const resolved = await waitForConflictResolution(
						{
							kind: "file",
							currentPath: destinationPath,
							fileName: fileEntry.name,
							allowedResolutions: ["duplicate", "overwrite", "skip"],
						},
						`File '${fileEntry.name}' already exists`,
					);
					resolution = resolved.action;
				}

				if (resolution === "skip") {
					return { status: "skipped" as const };
				}

				if (resolution === "duplicate") {
					const unique = await getUniqueFilename(
						destinationPath,
						targetProviderId,
					);
					finalDestinationPath = unique.path;
					finalFileName = unique.name;
				}

				if (resolution === "overwrite") {
					const overwriteProvider = await getSourceProvider(targetProviderId);
					try {
						await overwriteProvider.delete({
							remoteId: existingConflict.remoteId,
							isFolder: false,
						});
					} catch (deleteError) {
						logger.warn({
							msg: "Failed to delete conflicting destination file",
							jobId,
							fileId: existingConflict.id,
							error:
								deleteError instanceof Error
									? deleteError.message
									: String(deleteError),
						});
					}
					await db.delete(files).where(eq(files.id, existingConflict.id));
				}
			}

			if (file.providerId === targetProviderId) {
				const sameProvider = await getSourceProvider(targetProviderId);
				await reportFileProgress(
					fileEntry,
					0.5,
					buildFileTransferMessage(
						data.operation === "cut" ? "Moving" : "Copying",
						fileEntry.name,
					),
				);

				if (data.operation === "cut") {
					await sameProvider.move({
						remoteId: file.remoteId,
						newParentId: destinationFolder?.remoteId,
						...(finalFileName !== file.name ? { newName: finalFileName } : {}),
					});
					await db
						.update(files)
						.set({
							folderId: destinationFolder?.id ?? null,
							virtualPath: finalDestinationPath,
							name: finalFileName,
							updatedAt: new Date(),
						})
						.where(eq(files.id, file.id));
				} else {
					const copiedRemoteId = await sameProvider.copy({
						remoteId: file.remoteId,
						targetParentId: destinationFolder?.remoteId,
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
						folderId: destinationFolder?.id ?? null,
						uploadedBy: userId,
						isDeleted: false,
					});
				}

				return {
					status: "completed" as const,
					finalDestinationPath,
				};
			}

			const sourceProvider = await getSourceProvider(file.providerId);
			const transferDir = join(
				getTransferCacheRoot(),
				workspaceId,
				file.id,
				jobId,
			);
			const cachedFilePath = join(transferDir, "payload.bin");
			await mkdir(transferDir, { recursive: true });

			let finalRemoteId: string | undefined;

			try {
				await reportFileProgress(
					fileEntry,
					0.05,
					buildFileTransferMessage("Downloading", fileEntry.name),
				);
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

						await reportFileProgress(
							fileEntry,
							getTransferProgress(downloadedBytes, 0, file.size) * 0.5,
							buildFileTransferMessage("Downloading", fileEntry.name),
						);
					}
				} finally {
					await handle.close();
					reader.releaseLock();
				}

				await reportFileProgress(
					fileEntry,
					0.5,
					buildFileTransferMessage("Uploading", fileEntry.name),
				);

				if (
					resolvedTargetProvider.supportsChunkedUpload &&
					resolvedTargetProvider.initiateMultipartUpload &&
					resolvedTargetProvider.uploadPart &&
					resolvedTargetProvider.completeMultipartUpload
				) {
					const multipart =
						await resolvedTargetProvider.initiateMultipartUpload({
							name: finalFileName,
							mimeType: file.mimeType,
							size: file.size,
							parentId: destinationFolder?.remoteId,
						});
					finalRemoteId = multipart.remoteId;
					const cachedFile = Bun.file(cachedFilePath);
					const partCount = Math.max(
						1,
						Math.ceil(file.size / DEFAULT_TRANSFER_CHUNK_SIZE),
					);
					const parts: Array<{ partNumber: number; etag: string }> = [];

					for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
						await assertNotCancelled();
						const start = (partNumber - 1) * DEFAULT_TRANSFER_CHUNK_SIZE;
						const end = Math.min(
							start + DEFAULT_TRANSFER_CHUNK_SIZE,
							file.size,
						);
						const chunkData = Buffer.from(
							await cachedFile.slice(start, end).arrayBuffer(),
						);
						const uploadResult = await resolvedTargetProvider.uploadPart(
							multipart.uploadId,
							multipart.remoteId,
							partNumber,
							chunkData,
						);
						parts.push({
							partNumber: uploadResult.partNumber,
							etag: uploadResult.etag,
						});
						if (uploadResult.finalRemoteId) {
							finalRemoteId = uploadResult.finalRemoteId;
						}
						await reportFileProgress(
							fileEntry,
							0.5 + (partNumber / Math.max(partCount, 1)) * 0.5,
							buildFileTransferMessage("Uploading", fileEntry.name),
						);
					}

					await resolvedTargetProvider.completeMultipartUpload(
						multipart.uploadId,
						multipart.remoteId,
						parts,
					);
				} else {
					const uploadResponse = await resolvedTargetProvider.requestUpload({
						name: finalFileName,
						mimeType: file.mimeType,
						size: file.size,
						parentId: destinationFolder?.remoteId,
					});
					finalRemoteId =
						(await resolvedTargetProvider.uploadFile(
							uploadResponse.fileId,
							Bun.file(cachedFilePath).stream(),
						)) ?? uploadResponse.fileId;
				}

				if (!finalRemoteId) {
					throw new Error("Target provider did not return a remote file id");
				}

				if (data.operation === "cut") {
					const sourceRemoteId = file.remoteId;
					const sourceProviderId = file.providerId;
					const [updated] = await db
						.update(files)
						.set({
							providerId: targetProviderId,
							remoteId: finalRemoteId,
							folderId: destinationFolder?.id ?? null,
							virtualPath: finalDestinationPath,
							name: finalFileName,
							updatedAt: new Date(),
						})
						.where(eq(files.id, file.id))
						.returning();

					if (!updated) {
						try {
							await resolvedTargetProvider.delete({
								remoteId: finalRemoteId,
								isFolder: false,
							});
						} catch {
							// Best effort cleanup only.
						}
						throw new Error("Failed to update file record after transfer");
					}

					try {
						await sourceProvider.delete({
							remoteId: sourceRemoteId,
							isFolder: false,
						});
					} catch (deleteError) {
						logger.warn({
							msg: "[transfer:root] source deletion failed after DB update; file duplicated on source provider",
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
							folderId: destinationFolder?.id ?? null,
							uploadedBy: userId,
							isDeleted: false,
						})
						.returning();

					if (!inserted) {
						try {
							await resolvedTargetProvider.delete({
								remoteId: finalRemoteId,
								isFolder: false,
							});
						} catch {
							// Best effort cleanup only.
						}
						throw new Error("Failed to insert copied file");
					}
				}

				return {
					status: "completed" as const,
					finalDestinationPath,
				};
			} finally {
				await rm(transferDir, { recursive: true, force: true }).catch(() => {});
			}
		};

		for (const fileEntry of requireManifest().files) {
			if (fileEntry.status !== "pending") continue;

			await assertNotCancelled();
			const root = getRootById(fileEntry.sourceRootId);
			if (root?.status === "skipped") {
				fileEntry.status = "skipped";
				continue;
			}

			const destinationFolder = await ensureFolderChain(
				root,
				fileEntry.relativeDirPath,
			);

			try {
				const result = await executeFileTransfer(fileEntry, destinationFolder);
				fileEntry.status = result.status;
				if (result.status === "completed") {
					fileEntry.finalDestinationPath = result.finalDestinationPath;
				}
			} catch (error) {
				fileEntry.status = "failed";
				fileEntry.errorMessage =
					error instanceof Error ? error.message : String(error);
			}

			await persistManifest(requireManifest(), "running");
		}

		if (data.operation === "cut") {
			for (const root of requireManifest().roots) {
				if (root.status === "skipped") continue;
				const rootFiles = requireManifest().files.filter(
					(file) => file.sourceRootId === root.id,
				);
				const canDeleteSource = rootFiles.every(
					(file) => file.status === "completed",
				);
				if (!canDeleteSource) {
					continue;
				}

				await markFolderSubtreeDeleted(
					workspaceId,
					root.sourceProviderId,
					root.sourceVirtualPath,
				);

				const sourceProvider = await getSourceProvider(root.sourceProviderId);
				try {
					await sourceProvider.delete({
						remoteId: root.sourceRemoteId,
						isFolder: true,
					});
				} catch (deleteError) {
					logger.warn({
						msg: "[transfer:root] source folder deletion failed after DB update; remote orphan remains",
						jobId,
						folderId: root.sourceFolderId,
						error:
							deleteError instanceof Error
								? deleteError.message
								: String(deleteError),
					});
				}
			}
		}

		const finalManifest = requireManifest();
		await persistManifest(
			finalManifest,
			finalManifest.failedFiles > 0 ? "failed" : "completed",
		);

		if (finalManifest.failedFiles > 0) {
			await activityService.fail(
				jobId,
				getTransferCompletionMessage(finalManifest),
			);
			return;
		}

		await activityService.complete(
			jobId,
			getTransferCompletionMessage(finalManifest),
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error({
			msg: "[transfer:root] root transfer failed",
			jobId,
			transferSessionId: session.id,
			error: message,
		});
		await updateTransferSession(db, session.id, {
			status: "failed",
			manifest,
		}).catch(() => {});
		await activityService.fail(jobId, message);
	} finally {
		for (const provider of sourceProviders.values()) {
			await provider.cleanup().catch(() => {});
		}
		if (targetProvider) {
			await targetProvider.cleanup().catch(() => {});
		}
	}
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

		let file: Awaited<ReturnType<typeof getFile>>;
		try {
			file = await getFile(db, fileId, userId, workspaceId);
		} catch {
			await activityService.fail(jobId, "File not found");
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

				const { waitForJobResolution } = await import("@/utils/jobs/job-pause");
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
		// When source and target are the same provider use native move/copy instead
		// of downloading and re-uploading.  We still create a queued job so the UI
		// always shows progress regardless of whether the providers match.
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

const BATCH_POLL_INTERVAL_MS = 1000;
const BATCH_STALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function handleBatchTransfer(
	ctx: JobContext,
	data: ProviderBatchTransferJobData,
) {
	const db = getDb();
	const {
		activityService,
		providerService,
		jobId,
		workspaceId,
		userId,
		assertNotCancelled,
	} = ctx;
	const { childJobIds, operation, parentJobId } = data;
	const totalFiles = childJobIds.length;
	const verb = operation === "cut" ? "Moving" : "Copying";

	// The visible batch job is `parentJobId` — this monitor job is hidden.
	// All progress updates go to the visible batch job.
	const visibleJobId = parentJobId ?? jobId;

	async function updateBatch(input: {
		progress?: number;
		message?: string;
		status?: "pending" | "running" | "completed" | "error";
		metadata?: Record<string, unknown>;
	}) {
		await assertNotCancelled();
		await activityService.update(visibleJobId, input);
	}

	await updateBatch({
		status: "running",
		progress: 0,
		message: `${verb} 0 of ${totalFiles} files`,
		metadata: {
			phase: "monitoring",
			entity: "batch",
			operation,
			totalFiles,
			completedFiles: 0,
			failedFiles: 0,
		},
	});

	let lastChangeAt = Date.now();
	let lastObservedProgress = -1;
	let lastObservedFinishedCount = -1;
	let lastReportedProgress = -1;
	let lastMessage = "";

	while (true) {
		await assertNotCancelled();

		const childRows = await db
			.select({
				id: jobs.id,
				status: jobs.status,
				title: jobs.title,
				message: jobs.message,
				progress: jobs.progress,
			})
			.from(jobs)
			.where(inArray(jobs.id, childJobIds));

		const completed = childRows.filter((r) => r.status === "completed").length;
		const failed = childRows.filter((r) => r.status === "error").length;
		const active = childRows.filter(
			(r) =>
				r.status === "pending" ||
				r.status === "running" ||
				r.status === "paused",
		);
		const finishedCount = completed + failed;

		// Smooth progress: sum of individual file progresses
		const totalProgress = childRows.reduce(
			(sum, r) => sum + (r.progress ?? 0),
			0,
		);
		const progress = totalFiles > 0 ? totalProgress / totalFiles : 1;

		// Reset stall timer if progress increased or files finished
		if (
			progress > lastObservedProgress ||
			finishedCount > lastObservedFinishedCount
		) {
			lastChangeAt = Date.now();
			lastObservedProgress = progress;
			lastObservedFinishedCount = finishedCount;
		}

		// All children done - exit loop and finalize
		if (active.length === 0 && childRows.length === totalFiles) {
			break;
		}

		// Find the currently running job for display
		const running = childRows.find((r) => r.status === "running");
		const currentFileName =
			running?.title?.replace(/^(Move|Copy|Transfer)\s+/, "") ?? "";

		let message: string;
		if (failed > 0 && active.length > 0) {
			message = `${verb} ${completed} of ${totalFiles} files (${failed} failed)`;
		} else {
			message = currentFileName
				? `${verb} ${finishedCount} of ${totalFiles} files — ${currentFileName}`
				: `${verb} ${finishedCount} of ${totalFiles} files`;
		}

		// Throttle updates: only if message changed or progress jumped > 1%
		if (
			message !== lastMessage ||
			Math.abs(progress - lastReportedProgress) >= 0.01
		) {
			await updateBatch({
				progress,
				message,
				metadata: {
					phase: "monitoring",
					entity: "batch",
					operation,
					totalFiles,
					completedFiles: completed,
					failedFiles: failed,
				},
			});
			lastMessage = message;
			lastReportedProgress = progress;
		}

		// Stall guard — if nothing changes for 5 minutes, bail out
		if (Date.now() - lastChangeAt > BATCH_STALL_TIMEOUT_MS) {
			logger.error({
				msg: "[transfer:batch] stalled — no progress for timeout period",
				jobId,
				totalFiles,
				completed,
				failed,
				active: active.length,
			});
			await activityService.fail(
				visibleJobId,
				`Transfer stalled: ${completed} of ${totalFiles} completed, ${active.length} stuck`,
			);
			if (visibleJobId !== jobId) {
				await activityService.complete(jobId, "Batch monitor stalled");
			}
			return;
		}

		await sleep(BATCH_POLL_INTERVAL_MS);
	}

	// Finalize batch
	const finalRows = await db
		.select({ status: jobs.status })
		.from(jobs)
		.where(inArray(jobs.id, childJobIds));

	const completedCount = finalRows.filter(
		(r) => r.status === "completed",
	).length;
	const failedCount = finalRows.filter((r) => r.status === "error").length;

	// Clean up source folders for cut operations
	if (operation === "cut" && data.sourceFolders?.length) {
		await updateBatch({
			progress: 1,
			message: "Cleaning up source folders",
		});
		for (const sf of data.sourceFolders) {
			try {
				await markFolderSubtreeDeleted(
					workspaceId,
					sf.providerId,
					sf.virtualPath,
				);
				const record = await providerService.getProvider(
					sf.providerId,
					userId,
					workspaceId,
				);
				const provider = await providerService.getProviderInstance(record);
				try {
					await provider.delete({
						remoteId: sf.remoteId,
						isFolder: true,
					});
				} catch (deleteError) {
					logger.warn({
						msg: "[transfer:batch] source folder deletion failed; remote orphan remains",
						jobId,
						folderId: sf.id,
						error:
							deleteError instanceof Error
								? deleteError.message
								: String(deleteError),
					});
				} finally {
					await provider.cleanup().catch(() => {});
				}
			} catch (cleanupError) {
				logger.warn({
					msg: "[transfer:batch] source folder cleanup failed",
					jobId,
					folderId: sf.id,
					error:
						cleanupError instanceof Error
							? cleanupError.message
							: String(cleanupError),
				});
			}
		}
	}

	if (failedCount > 0) {
		await activityService.fail(
			visibleJobId,
			`${completedCount} of ${totalFiles} files transferred, ${failedCount} failed`,
		);
	} else {
		await activityService.complete(
			visibleJobId,
			`${completedCount} files transferred`,
		);
	}

	if (visibleJobId !== jobId) {
		await activityService.complete(jobId, "Batch monitor done");
	}
}

export function createTransferWorker(): Worker<ProviderTransferJobData> {
	const worker = new Worker<ProviderTransferJobData>(
		"provider-transfers",
		async (bullJob) => {
			const db = getDb();
			const activityService = new ActivityService(db);
			const providerService = new ProviderService(db);
			const rawData = bullJob.data as { jobId?: string } | undefined;
			let jobId = rawData?.jobId ?? "";

			try {
				const data = normalizeJobData(bullJob.data);
				const { workspaceId, userId } = data;
				jobId = data.jobId;

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
					status?: Job["status"];
					metadata?: Record<string, unknown>;
				}) => {
					await assertNotCancelled();
					const isPaused = input.status === "paused";
					await activityService.update(jobId, {
						...input,
						suppressEvent: Boolean(data.parentJobId) && !isPaused,
					});
				};

				const ctx: JobContext = {
					activityService,
					providerService,
					jobId,
					workspaceId,
					userId,
					assertNotCancelled,
					updateActivity,
				};
				if (isRootTransferJobData(data)) {
					await handleRootTransfer(ctx, data);
				} else if (isBatchTransferJobData(data)) {
					await handleBatchTransfer(ctx, data);
				} else if (isFileTransferJobData(data)) {
					await handleFileTransfer(ctx, data);
				} else {
					await handleFolderTransfer(ctx, data);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (error instanceof JobCancelledError) {
					if (jobId) {
						await activityService.update(jobId, {
							status: "error",
							message: "Transfer cancelled",
							metadata: {
								phase: "cancelled",
								cancelled: true,
							},
						});
					}
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

				if (jobId) {
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
				}
				if (nonRetryable) {
					bullJob.discard();
				}
				throw error;
			} finally {
				if (jobId) {
					await clearJobCancellation(jobId);
				}
			}
		},
		{
			connection: createBullMQConnection(),
			concurrency: 10,
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
