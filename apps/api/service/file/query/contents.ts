import type { Database } from "@drivebase/db";
import { files, folders, storageProviders } from "@drivebase/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { ContentsResult } from "../types";
import { refreshSingleFolderCache } from "./contents-cache";
import {
	hasCachedChildrenForFolder,
	hasCachedRootItemsForProvider,
} from "./contents-cache-state";
import {
	childFileConditions,
	childFolderConditions,
	rootFileConditions,
	rootFolderConditions,
} from "./query-filters";

async function loadRootContents(
	db: Database,
	workspaceId: string,
	providerIds?: string[],
): Promise<ContentsResult> {
	const [fileList, folderList] = await Promise.all([
		db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(and(...rootFileConditions(workspaceId, providerIds)))
			.orderBy(files.name)
			.then((rows) => rows.map((row) => row.file)),
		db
			.select()
			.from(folders)
			.where(and(...rootFolderConditions(workspaceId, providerIds)))
			.orderBy(folders.name),
	]);

	return { files: fileList, folders: folderList, folder: null };
}

async function loadFolderContents(
	db: Database,
	workspaceId: string,
	folderId: string,
	providerIds?: string[],
): Promise<ContentsResult> {
	const [targetFolder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!targetFolder) {
		return { files: [], folders: [], folder: null };
	}

	const [fileList, folderList] = await Promise.all([
		db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(...childFileConditions(workspaceId, targetFolder.id, providerIds)),
			)
			.orderBy(files.name)
			.then((rows) => rows.map((row) => row.file)),
		db
			.select()
			.from(folders)
			.where(
				and(
					...childFolderConditions(workspaceId, targetFolder.id, providerIds),
				),
			)
			.orderBy(folders.name),
	]);

	return { files: fileList, folders: folderList, folder: targetFolder };
}

async function warmRootCache(
	db: Database,
	workspaceId: string,
	userId: string,
	providerIds?: string[],
) {
	const providerConditions = [
		eq(storageProviders.workspaceId, workspaceId),
		eq(storageProviders.isActive, true),
	];

	if (providerIds && providerIds.length > 0) {
		providerConditions.push(inArray(storageProviders.id, providerIds));
	}

	const providerRecords = await db
		.select()
		.from(storageProviders)
		.where(and(...providerConditions));

	await Promise.all(
		providerRecords.map(async (providerRecord) => {
			const hasCached = await hasCachedRootItemsForProvider(
				db,
				workspaceId,
				providerRecord.id,
			);

			if (!hasCached) {
				await refreshSingleFolderCache(
					db,
					workspaceId,
					userId,
					providerRecord,
					undefined,
					null,
					"/",
				);
			}
		}),
	);
}

async function warmFolderCache(
	db: Database,
	workspaceId: string,
	userId: string,
	folderId: string,
	providerIds?: string[],
) {
	const [targetFolder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!targetFolder) return;
	if (providerIds && !providerIds.includes(targetFolder.providerId)) return;

	const [providerRecord] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, targetFolder.providerId),
				eq(storageProviders.workspaceId, workspaceId),
				eq(storageProviders.isActive, true),
			),
		)
		.limit(1);

	if (!providerRecord) return;

	const hasCachedChildren = await hasCachedChildrenForFolder(
		db,
		workspaceId,
		providerRecord.id,
		targetFolder.id,
	);

	if (!hasCachedChildren) {
		await refreshSingleFolderCache(
			db,
			workspaceId,
			userId,
			providerRecord,
			targetFolder.remoteId,
			targetFolder.id,
			targetFolder.virtualPath,
		);
	}
}

export async function getContents(
	db: Database,
	workspaceId: string,
	userId: string,
	folderId?: string,
	providerIds?: string[],
): Promise<ContentsResult> {
	if (!folderId) {
		await warmRootCache(db, workspaceId, userId, providerIds);
		return loadRootContents(db, workspaceId, providerIds);
	}

	await warmFolderCache(db, workspaceId, userId, folderId, providerIds);
	return loadFolderContents(db, workspaceId, folderId, providerIds);
}
