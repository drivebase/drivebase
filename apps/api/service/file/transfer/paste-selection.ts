import {
	ConflictError,
	joinPath,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database, Job } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { and, eq, like } from "drizzle-orm";
import { enqueueProviderTransfer } from "@/queue/transfer/enqueue";
import { ActivityService } from "@/service/activity";
import { moveFolder } from "@/service/folder/mutation";
import { getFolder } from "@/service/folder/query";
import { ProviderService } from "@/service/provider";
import { logger } from "@/utils/runtime/logger";
import { getFile } from "../query/file-read";

export type PasteOperation = "cut" | "copy";
export type ClipboardItemKind = "file" | "folder";

export interface ClipboardItemInput {
	kind: ClipboardItemKind;
	id: string;
}

export interface PasteSelectionResult {
	jobs: Job[];
	requiresRefresh: boolean;
}

interface LoadedFolderItem {
	kind: "folder";
	id: string;
	virtualPath: string;
	providerId: string;
	name: string;
	parentId: string | null;
}

interface LoadedFileItem {
	kind: "file";
	id: string;
	virtualPath: string;
	providerId: string;
	name: string;
	folderId: string | null;
}

type LoadedItem = LoadedFolderItem | LoadedFileItem;

function dedupeItems(items: ClipboardItemInput[]): ClipboardItemInput[] {
	const unique = new Map<string, ClipboardItemInput>();
	for (const item of items) {
		unique.set(`${item.kind}:${item.id}`, item);
	}
	return Array.from(unique.values());
}

function filterTopLevelItems(items: LoadedItem[]): LoadedItem[] {
	const selectedFolderPaths = new Set(
		items
			.filter((item): item is LoadedFolderItem => item.kind === "folder")
			.map((folder) => folder.virtualPath),
	);

	const topLevelFolders = items
		.filter((item): item is LoadedFolderItem => item.kind === "folder")
		.filter(
			(folder) =>
				![...selectedFolderPaths].some(
					(parentPath) =>
						parentPath !== folder.virtualPath &&
						folder.virtualPath.startsWith(`${parentPath}/`),
				),
		);

	const topLevelFolderPaths = new Set(
		topLevelFolders.map((folder) => folder.virtualPath),
	);
	const topLevelFiles = items
		.filter((item): item is LoadedFileItem => item.kind === "file")
		.filter(
			(file) =>
				![...topLevelFolderPaths].some(
					(folderPath) =>
						file.virtualPath === folderPath ||
						file.virtualPath.startsWith(`${folderPath}/`),
				),
		);

	return [...topLevelFolders, ...topLevelFiles];
}

async function ensureNoFileConflict(
	db: Database,
	virtualPath: string,
	providerId: string,
	excludingId?: string,
) {
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

	if (existing && existing.id !== excludingId) {
		throw new ConflictError(`File already exists at path: ${virtualPath}`);
	}
}

async function ensureNoFolderConflict(
	db: Database,
	virtualPath: string,
	providerId: string,
	excludingId?: string,
) {
	const [existing] = await db
		.select({ id: folders.id })
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

	if (existing && existing.id !== excludingId) {
		throw new ConflictError(`Folder already exists at path: ${virtualPath}`);
	}
}

// ── Cross-provider folder creation ─────────────────────────────────────

interface FolderMapping {
	sourceFolderId: string;
	destinationFolderId: string;
}

/**
 * Create the destination folder tree for a source folder on the target
 * provider.  Returns a map of source-folder-ID → destination-folder-ID
 * so that file transfers can be pointed at the right destination folder.
 *
 * Silently reuses destination folders that already exist (retry-safe).
 */
async function createDestinationFolderTree(
	db: Database,
	workspaceId: string,
	userId: string,
	sourceFolder: {
		id: string;
		name: string;
		virtualPath: string;
		providerId: string;
	},
	targetProviderId: string,
	targetParentFolderId: string | null,
	targetProvider: {
		createFolder: (opts: {
			name: string;
			parentId?: string;
		}) => Promise<string>;
	},
): Promise<Map<string, string>> {
	const destinationBySourceId = new Map<string, string>();

	// Resolve target parent folder (if any)
	const targetParent = targetParentFolderId
		? await db
				.select()
				.from(folders)
				.where(
					and(
						eq(folders.id, targetParentFolderId),
						eq(folders.nodeType, "folder"),
						eq(folders.isDeleted, false),
					),
				)
				.limit(1)
				.then((rows) => rows[0] ?? null)
		: null;

	const destinationRootPath = joinPath(
		targetParent?.virtualPath ?? "/",
		sourceFolder.name,
	);

	// Load all source subfolders
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
	// Include the root folder itself at the front
	const allSourceFolders = [
		{
			id: sourceFolder.id,
			name: sourceFolder.name,
			virtualPath: sourceFolder.virtualPath,
			parentId: null as string | null,
		},
		...sourceSubfolders.map((f) => ({
			id: f.id,
			name: f.name,
			virtualPath: f.virtualPath,
			parentId: f.parentId,
		})),
	];
	const sourceFolderById = new Map(allSourceFolders.map((f) => [f.id, f]));

	// Process shallowest first
	const sorted = allSourceFolders.sort(
		(a, b) => a.virtualPath.length - b.virtualPath.length,
	);

	for (const src of sorted) {
		const isRoot = src.id === sourceFolder.id;
		let destParentId: string | null;
		let destParentPath: string;

		if (isRoot) {
			destParentId = targetParentFolderId;
			destParentPath = targetParent?.virtualPath ?? "/";
		} else {
			const srcParent = src.parentId
				? sourceFolderById.get(src.parentId)
				: undefined;
			const mappedParentId = srcParent
				? destinationBySourceId.get(srcParent.id)
				: destinationBySourceId.get(sourceFolder.id);
			destParentId = mappedParentId ?? targetParentFolderId;
			// Look up the destination parent's virtualPath
			if (destParentId) {
				const [destParentRow] = await db
					.select({ virtualPath: folders.virtualPath })
					.from(folders)
					.where(eq(folders.id, destParentId))
					.limit(1);
				destParentPath = destParentRow?.virtualPath ?? "/";
			} else {
				destParentPath = "/";
			}
		}

		const destVirtualPath = joinPath(destParentPath, src.name);

		// Check if destination folder already exists (retry-safe)
		const [existing] = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.nodeType, "folder"),
					eq(folders.providerId, targetProviderId),
					eq(folders.virtualPath, destVirtualPath),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
				),
			)
			.limit(1);

		if (existing) {
			destinationBySourceId.set(src.id, existing.id);
			continue;
		}

		// Resolve remote parent ID for the provider API
		let remoteParentId: string | undefined;
		if (destParentId) {
			const [parentRow] = await db
				.select({ remoteId: folders.remoteId })
				.from(folders)
				.where(eq(folders.id, destParentId))
				.limit(1);
			remoteParentId = parentRow?.remoteId ?? undefined;
		}

		const remoteId = await targetProvider.createFolder({
			name: src.name,
			...(remoteParentId ? { parentId: remoteParentId } : {}),
		});

		const [inserted] = await db
			.insert(folders)
			.values({
				nodeType: "folder",
				virtualPath: destVirtualPath,
				name: src.name,
				remoteId,
				providerId: targetProviderId,
				workspaceId,
				parentId: destParentId,
				createdBy: userId,
				isDeleted: false,
			})
			.returning();

		if (!inserted) {
			throw new Error(
				`Failed to create destination folder: ${destVirtualPath}`,
			);
		}
		destinationBySourceId.set(src.id, inserted.id);
	}

	return destinationBySourceId;
}

/**
 * Collect all files inside a source folder (recursively).
 */
async function collectFilesInFolder(
	db: Database,
	workspaceId: string,
	sourceFolder: { id: string; virtualPath: string; providerId: string },
): Promise<
	Array<{
		id: string;
		name: string;
		virtualPath: string;
		providerId: string;
		folderId: string | null;
	}>
> {
	return db
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
				eq(files.workspaceId, workspaceId),
				eq(files.providerId, sourceFolder.providerId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				like(files.virtualPath, `${sourceFolder.virtualPath}/%`),
			),
		)
		.orderBy(files.virtualPath);
}

// ── Main entry point ───────────────────────────────────────────────────

export async function pasteSelection(
	db: Database,
	userId: string,
	workspaceId: string,
	operation: PasteOperation,
	targetFolderId: string | null,
	targetProviderId: string | null,
	items: ClipboardItemInput[],
): Promise<PasteSelectionResult> {
	logger.debug({
		msg: "[paste] request received",
		userId,
		workspaceId,
		operation,
		targetFolderId,
		targetProviderId,
		itemCount: items.length,
	});
	if (items.length === 0) {
		return { jobs: [], requiresRefresh: false };
	}
	if (operation !== "cut" && operation !== "copy") {
		throw new ValidationError("Invalid paste operation");
	}

	const dedupedItems = dedupeItems(items);
	const loadedItems: LoadedItem[] = [];
	for (const item of dedupedItems) {
		if (item.kind === "folder") {
			const folder = await getFolder(db, item.id, userId, workspaceId);
			loadedItems.push({
				kind: "folder",
				id: folder.id,
				virtualPath: folder.virtualPath,
				providerId: folder.providerId,
				name: folder.name,
				parentId: folder.parentId,
			});
			continue;
		}
		if (item.kind === "file") {
			const file = await getFile(db, item.id, userId, workspaceId);
			loadedItems.push({
				kind: "file",
				id: file.id,
				virtualPath: file.virtualPath,
				providerId: file.providerId,
				name: file.name,
				folderId: file.folderId,
			});
			continue;
		}
		throw new ValidationError(`Unsupported clipboard item: ${item.kind}`);
	}

	const topLevelItems = filterTopLevelItems(loadedItems);
	const targetFolder = targetFolderId
		? await getFolder(db, targetFolderId, userId, workspaceId)
		: null;
	if (
		targetFolder &&
		targetProviderId &&
		targetFolder.providerId !== targetProviderId
	) {
		throw new ValidationError(
			"Target folder and provider must belong to the same storage provider",
		);
	}
	const effectiveTargetProviderId =
		targetFolder?.providerId ?? targetProviderId;
	logger.debug({
		msg: "[paste] normalized clipboard items",
		operation,
		targetFolderId: targetFolder?.id ?? null,
		targetProviderId: effectiveTargetProviderId ?? null,
		dedupedCount: dedupedItems.length,
		topLevelCount: topLevelItems.length,
	});

	const activityService = new ActivityService(db);
	const providerService = new ProviderService(db);
	const queuedJobs: Job[] = [];
	let requiresRefresh = false;

	// ── Separate same-provider (sync) from cross-provider (async) ──────

	interface CrossProviderFile {
		fileId: string;
		fileName: string;
		sourceProviderId: string;
		targetProviderId: string;
		targetFolderId: string | null;
	}

	interface CrossProviderFolder {
		folder: LoadedFolderItem;
		targetProviderId: string;
	}

	const crossProviderFiles: CrossProviderFile[] = [];
	const crossProviderFolders: CrossProviderFolder[] = [];

	for (const item of topLevelItems) {
		if (item.kind === "file") {
			const file = await getFile(db, item.id, userId, workspaceId);
			const targetProviderId = effectiveTargetProviderId ?? file.providerId;
			// All file transfers (same-provider or cross-provider) go through the queue
			// so progress is always visible. The worker detects same-provider and uses
			// native move/copy instead of download+reupload.
			crossProviderFiles.push({
				fileId: file.id,
				fileName: file.name,
				sourceProviderId: file.providerId,
				targetProviderId,
				targetFolderId: targetFolder?.id ?? null,
			});
			continue;
		}

		// Folder item
		const folder = await getFolder(db, item.id, userId, workspaceId);
		if (
			targetFolder &&
			(targetFolder.id === folder.id ||
				targetFolder.virtualPath.startsWith(`${folder.virtualPath}/`))
		) {
			throw new ValidationError(
				"Cannot paste a folder into itself or a descendant folder",
			);
		}

		if (
			operation === "cut" &&
			(!targetFolder || targetFolder.providerId === folder.providerId)
		) {
			const destinationPath = joinPath(
				targetFolder?.virtualPath ?? "/",
				folder.name,
			);
			await ensureNoFolderConflict(
				db,
				destinationPath,
				folder.providerId,
				folder.id,
			);
			await moveFolder(
				db,
				folder.id,
				userId,
				workspaceId,
				targetFolder?.id ?? undefined,
			);
			requiresRefresh = true;
			continue;
		}

		// Cross-provider folder
		const targetProviderId = effectiveTargetProviderId ?? folder.providerId;
		crossProviderFolders.push({
			folder: {
				kind: "folder",
				id: folder.id,
				virtualPath: folder.virtualPath,
				providerId: folder.providerId,
				name: folder.name,
				parentId: folder.parentId,
			},
			targetProviderId,
		});
	}

	// ── Enqueue cross-provider transfers ────────────────────────────────

	const totalCrossProvider =
		crossProviderFiles.length + crossProviderFolders.length;

	if (totalCrossProvider > 0) {
		// Group folders by target provider to reuse provider instances
		const providerInstances = new Map<
			string,
			Awaited<ReturnType<ProviderService["getProviderInstance"]>>
		>();

		async function getTargetProviderInstance(targetProviderId: string) {
			let instance = providerInstances.get(targetProviderId);
			if (!instance) {
				const record = await providerService.getProvider(
					targetProviderId,
					userId,
					workspaceId,
				);
				instance = await providerService.getProviderInstance(record);
				providerInstances.set(targetProviderId, instance);
			}
			return instance;
		}

		try {
			// Create destination folder trees and collect all files to transfer
			const allFileTransfers: CrossProviderFile[] = [...crossProviderFiles];

			// Track source folders for cut cleanup
			const sourceFoldersForCleanup: Array<{
				id: string;
				providerId: string;
				virtualPath: string;
				remoteId: string;
			}> = [];

			for (const { folder, targetProviderId } of crossProviderFolders) {
				const targetProvider =
					await getTargetProviderInstance(targetProviderId);
				const folderMap = await createDestinationFolderTree(
					db,
					workspaceId,
					userId,
					folder,
					targetProviderId,
					targetFolder?.id ?? null,
					targetProvider,
				);

				// Get the full folder record for cleanup (need remoteId)
				if (operation === "cut") {
					const fullFolder = await getFolder(
						db,
						folder.id,
						userId,
						workspaceId,
					);
					sourceFoldersForCleanup.push({
						id: fullFolder.id,
						providerId: fullFolder.providerId,
						virtualPath: fullFolder.virtualPath,
						remoteId: fullFolder.remoteId,
					});
				}

				// Collect files inside this folder
				const nestedFiles = await collectFilesInFolder(db, workspaceId, folder);
				for (const nf of nestedFiles) {
					const destFolderId =
						(nf.folderId ? folderMap.get(nf.folderId) : null) ??
						folderMap.get(folder.id) ??
						null;
					allFileTransfers.push({
						fileId: nf.id,
						fileName: nf.name,
						sourceProviderId: nf.providerId,
						targetProviderId,
						targetFolderId: destFolderId,
					});
				}
			}

			if (allFileTransfers.length === 0 && crossProviderFolders.length > 0) {
				// Folders with no files — just mark as done
				requiresRefresh = true;
			} else if (allFileTransfers.length === 1) {
				// Single file — no batch needed
				const ft = allFileTransfers[0]!;
				const { activityJob } = await enqueueProviderTransfer(activityService, {
					entity: "file",
					operation,
					workspaceId,
					userId,
					fileId: ft.fileId,
					targetProviderId: ft.targetProviderId,
					targetFolderId: ft.targetFolderId,
					title: `${operation === "cut" ? "Move" : "Copy"} ${ft.fileName}`,
					message: "Queued for transfer",
					metadata: {
						fileId: ft.fileId,
						fileName: ft.fileName,
						sourceProviderId: ft.sourceProviderId,
						targetProviderId: ft.targetProviderId,
						targetFolderId: ft.targetFolderId,
					},
				});
				queuedJobs.push(activityJob);
			} else if (allFileTransfers.length > 1) {
				// Multiple files — create a batch job, enqueue all files under it
				const verb = operation === "cut" ? "Moving" : "Copying";
				const batchTitle = `${verb} ${allFileTransfers.length} files`;

				// Create the batch activity job first (this is the visible one)
				const batchJob = await activityService.create(workspaceId, {
					type: "provider_transfer",
					title: batchTitle,
					message: `${verb} 0 of ${allFileTransfers.length} files (queued)`,
					metadata: {
						entity: "batch",
						operation,
						totalFiles: allFileTransfers.length,
						phase: "queued",
					},
				});

				// Enqueue individual file transfers under the batch
				const childJobIds: string[] = [];
				for (const ft of allFileTransfers) {
					const { activityJob } = await enqueueProviderTransfer(
						activityService,
						{
							entity: "file",
							operation,
							workspaceId,
							userId,
							parentJobId: batchJob.id,
							fileId: ft.fileId,
							targetProviderId: ft.targetProviderId,
							targetFolderId: ft.targetFolderId,
							title: `${operation === "cut" ? "Move" : "Copy"} ${ft.fileName}`,
							message: "Queued for transfer",
							metadata: {
								fileId: ft.fileId,
								fileName: ft.fileName,
								sourceProviderId: ft.sourceProviderId,
								targetProviderId: ft.targetProviderId,
								targetFolderId: ft.targetFolderId,
								parentJobId: batchJob.id,
							},
						},
					);
					childJobIds.push(activityJob.id);
				}

				// Enqueue the batch monitor worker job (hidden — has parentJobId)
				await enqueueProviderTransfer(activityService, {
					entity: "batch",
					operation,
					workspaceId,
					userId,
					parentJobId: batchJob.id,
					childJobIds,
					sourceFolders:
						operation === "cut" && sourceFoldersForCleanup.length > 0
							? sourceFoldersForCleanup
							: undefined,
					title: batchTitle,
					message: `${verb} 0 of ${allFileTransfers.length} files`,
					metadata: {
						entity: "batch",
						operation,
						totalFiles: allFileTransfers.length,
						childJobIds,
						parentJobId: batchJob.id,
					},
				});

				// Update the visible batch job with child IDs
				await activityService.update(batchJob.id, {
					metadata: {
						...(batchJob.metadata ?? {}),
						childJobIds,
						totalFiles: allFileTransfers.length,
					},
				});

				queuedJobs.push(batchJob);
			}
		} finally {
			// Cleanup all provider instances
			for (const instance of providerInstances.values()) {
				await instance.cleanup().catch(() => {});
			}
		}
	}

	if (queuedJobs.length === 0 && !requiresRefresh) {
		throw new NotFoundError("No valid clipboard items to paste");
	}

	logger.debug({
		msg: "[paste] completed",
		operation,
		queuedJobs: queuedJobs.map((job) => job.id),
		requiresRefresh,
	});
	return { jobs: queuedJobs, requiresRefresh };
}
