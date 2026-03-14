import {
	ConflictError,
	joinPath,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database, Job } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { enqueueProviderTransfer } from "@/queue/transfer/enqueue";
import { ActivityService } from "@/service/activity";
import { moveFolder } from "@/service/folder/mutation";
import { getFolder } from "@/service/folder/query";
import { ProviderService } from "@/service/provider";
import { logger } from "@/utils/runtime/logger";
import { moveFile } from "../mutation/move-file";
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

async function copyFileWithinProvider(
	db: Database,
	userId: string,
	workspaceId: string,
	fileId: string,
	targetFolderId: string | null,
) {
	const sourceFile = await getFile(db, fileId, userId, workspaceId);
	let targetFolder: Awaited<ReturnType<typeof getFolder>> | null = null;
	let destinationPath = joinPath("/", sourceFile.name);

	if (targetFolderId) {
		targetFolder = await getFolder(db, targetFolderId, userId, workspaceId);
		if (targetFolder.providerId !== sourceFile.providerId) {
			throw new ValidationError(
				"Cannot copy file within provider to a different provider destination",
			);
		}
		destinationPath = joinPath(targetFolder.virtualPath, sourceFile.name);
	}

	await ensureNoFileConflict(
		db,
		destinationPath,
		sourceFile.providerId,
		undefined,
	);

	const providerService = new ProviderService(db);
	const providerRecord = await providerService.getProvider(
		sourceFile.providerId,
		userId,
		workspaceId,
	);
	const provider = await providerService.getProviderInstance(providerRecord);

	try {
		const copiedRemoteId = await provider.copy({
			remoteId: sourceFile.remoteId,
			targetParentId: targetFolder?.remoteId,
		});
		const [inserted] = await db
			.insert(files)
			.values({
				nodeType: "file",
				virtualPath: destinationPath,
				name: sourceFile.name,
				mimeType: sourceFile.mimeType,
				size: sourceFile.size,
				hash: sourceFile.hash,
				remoteId: copiedRemoteId,
				providerId: sourceFile.providerId,
				workspaceId,
				folderId: targetFolderId,
				uploadedBy: userId,
				isDeleted: false,
			})
			.returning();

		if (!inserted) {
			throw new Error("Failed to create copied file record");
		}

		return inserted;
	} finally {
		await provider.cleanup();
	}
}

export async function pasteSelection(
	db: Database,
	userId: string,
	workspaceId: string,
	operation: PasteOperation,
	targetFolderId: string | null,
	items: ClipboardItemInput[],
): Promise<PasteSelectionResult> {
	logger.debug({
		msg: "[paste] request received",
		userId,
		workspaceId,
		operation,
		targetFolderId,
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
	logger.debug({
		msg: "[paste] normalized clipboard items",
		operation,
		targetFolderId: targetFolder?.id ?? null,
		targetProviderId: targetFolder?.providerId ?? null,
		dedupedCount: dedupedItems.length,
		topLevelCount: topLevelItems.length,
	});

	const activityService = new ActivityService(db);
	const queuedJobs: Job[] = [];
	let requiresRefresh = false;

	for (const item of topLevelItems) {
		if (item.kind === "file") {
			const file = await getFile(db, item.id, userId, workspaceId);
			const targetProviderId = targetFolder
				? targetFolder.providerId
				: file.providerId;
			const destinationPath = joinPath(
				targetFolder?.virtualPath ?? "/",
				file.name,
			);
			logger.debug({
				msg: "[paste] handling file item",
				operation,
				fileId: file.id,
				sourceProviderId: file.providerId,
				targetProviderId,
				targetFolderId: targetFolder?.id ?? null,
				destinationPath,
			});

			if (operation === "cut" && targetProviderId === file.providerId) {
				await ensureNoFileConflict(
					db,
					destinationPath,
					targetProviderId,
					file.id,
				);
				await moveFile(
					db,
					file.id,
					userId,
					workspaceId,
					targetFolder?.id ?? undefined,
				);
				logger.debug({
					msg: "[paste] executed same-provider file cut",
					fileId: file.id,
					targetFolderId: targetFolder?.id ?? null,
					destinationPath,
				});
				requiresRefresh = true;
				continue;
			}

			if (operation === "copy" && targetProviderId === file.providerId) {
				await copyFileWithinProvider(
					db,
					userId,
					workspaceId,
					file.id,
					targetFolder?.id ?? null,
				);
				logger.debug({
					msg: "[paste] executed same-provider file copy",
					fileId: file.id,
					targetFolderId: targetFolder?.id ?? null,
					destinationPath,
				});
				requiresRefresh = true;
				continue;
			}

			await ensureNoFileConflict(db, destinationPath, targetProviderId);
			const { activityJob } = await enqueueProviderTransfer(activityService, {
				entity: "file",
				operation,
				workspaceId,
				userId,
				fileId: file.id,
				targetProviderId,
				targetFolderId: targetFolder?.id ?? null,
				title: `${operation === "cut" ? "Move" : "Copy"} ${file.name}`,
				message: "Queued for transfer",
				metadata: {
					fileId: file.id,
					fileName: file.name,
					sourceProviderId: file.providerId,
					targetProviderId,
					targetFolderId: targetFolder?.id ?? null,
				},
			});
			queuedJobs.push(activityJob);
			logger.debug({
				msg: "[paste] queued file transfer",
				fileId: file.id,
				jobId: activityJob.id,
				operation,
				targetProviderId,
				targetFolderId: targetFolder?.id ?? null,
			});
			continue;
		}

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
			logger.debug({
				msg: "[paste] executed same-provider folder cut",
				folderId: folder.id,
				targetFolderId: targetFolder?.id ?? null,
				destinationPath,
			});
			requiresRefresh = true;
			continue;
		}

		const targetProviderId = targetFolder
			? targetFolder.providerId
			: folder.providerId;
		const destinationPath = joinPath(
			targetFolder?.virtualPath ?? "/",
			folder.name,
		);
		// Skip the folder conflict check for cross-provider transfers.
		// The worker's handleFolderTransfer will reuse any existing
		// destination folder from a previous failed attempt instead of
		// erroring out, which makes retries safe.

		const { activityJob } = await enqueueProviderTransfer(activityService, {
			entity: "folder",
			operation,
			workspaceId,
			userId,
			folderId: folder.id,
			targetFolderId: targetFolder?.id ?? null,
			title: `${operation === "cut" ? "Move" : "Copy"} ${folder.name}`,
			message: "Queued for transfer",
			metadata: {
				folderId: folder.id,
				folderName: folder.name,
				sourceProviderId: folder.providerId,
				targetProviderId,
				targetFolderId: targetFolder?.id ?? null,
			},
		});
		queuedJobs.push(activityJob);
		logger.debug({
			msg: "[paste] queued folder transfer",
			folderId: folder.id,
			jobId: activityJob.id,
			operation,
			targetProviderId,
			targetFolderId: targetFolder?.id ?? null,
			destinationPath,
		});
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
