import { ValidationError } from "@drivebase/core";
import type { Database, Job } from "@drivebase/db";
import {
	buildTransferQueueJobId,
	getTransferQueue,
} from "@/queue/transfer/queue";
import { ActivityService } from "@/service/activity";
import { getFolder } from "@/service/folder/query";
import { logger } from "@/utils/runtime/logger";
import { getFile } from "../query/file-read";
import {
	createTransferSession,
	type TransferSourceItem,
} from "./transfer-session";

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
	const sourceProviderIds = new Set(
		topLevelItems.map((item) => item.providerId),
	);
	const resolvedTargetProviderId =
		effectiveTargetProviderId ??
		(sourceProviderIds.size === 1
			? (Array.from(sourceProviderIds)[0] ?? null)
			: null);

	if (!resolvedTargetProviderId) {
		throw new ValidationError(
			"Target provider is required when pasting items from multiple storage providers",
		);
	}

	for (const item of topLevelItems) {
		if (item.kind !== "folder") continue;
		if (
			targetFolder &&
			(targetFolder.id === item.id ||
				targetFolder.virtualPath.startsWith(`${item.virtualPath}/`))
		) {
			throw new ValidationError(
				"Cannot paste a folder into itself or a descendant folder",
			);
		}
	}

	const selectionLabel =
		topLevelItems.length === 1
			? (topLevelItems[0]?.name ?? "selection")
			: `${topLevelItems.length} items`;
	const verb = operation === "cut" ? "Move" : "Copy";
	const activityJob = await activityService.create(workspaceId, {
		type: "provider_transfer",
		title: `${verb} ${selectionLabel}`,
		message: "Queued for transfer",
		metadata: {
			entity: "transfer",
			operation,
			phase: "queued",
		},
	});

	const sourceItems: TransferSourceItem[] = topLevelItems.map((item) => ({
		kind: item.kind,
		id: item.id,
	}));

	const session = await createTransferSession(db, {
		workspaceId,
		userId,
		jobId: activityJob.id,
		operation,
		targetFolderId: targetFolder?.id ?? null,
		targetProviderId: resolvedTargetProviderId,
		sourceItems,
	});

	const queueJobId = buildTransferQueueJobId({
		entity: "transfer",
		jobId: activityJob.id,
	});
	await getTransferQueue().add(
		"provider-transfer",
		{
			entity: "transfer",
			jobId: activityJob.id,
			workspaceId,
			userId,
			transferSessionId: session.id,
			operation,
		},
		{ jobId: queueJobId },
	);

	const queuedJob = await activityService.update(activityJob.id, {
		metadata: {
			...(activityJob.metadata ?? {}),
			queueJobId,
			transferSessionId: session.id,
			targetFolderId: targetFolder?.id ?? null,
			targetProviderId: resolvedTargetProviderId,
		},
	});

	logger.debug({
		msg: "[paste] completed",
		operation,
		queuedJobs: [queuedJob.id],
		requiresRefresh: false,
	});
	return { jobs: [queuedJob], requiresRefresh: false };
}
