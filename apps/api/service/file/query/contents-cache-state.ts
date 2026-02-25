import type { Database } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";

export async function hasCachedRootItemsForProvider(
	db: Database,
	workspaceId: string,
	providerId: string,
) {
	const [rootFiles, rootFolders] = await Promise.all([
		db
			.select({ id: files.id })
			.from(files)
			.where(
				and(
					eq(files.providerId, providerId),
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					isNull(files.folderId),
				),
			)
			.limit(1),
		db
			.select({ id: folders.id })
			.from(folders)
			.where(
				and(
					eq(folders.providerId, providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					isNull(folders.parentId),
				),
			)
			.limit(1),
	]);

	return rootFiles.length > 0 || rootFolders.length > 0;
}

export async function hasCachedChildrenForFolder(
	db: Database,
	workspaceId: string,
	providerId: string,
	folderId: string,
) {
	const [childFiles, childFolders] = await Promise.all([
		db
			.select({ id: files.id })
			.from(files)
			.where(
				and(
					eq(files.providerId, providerId),
					eq(files.nodeType, "file"),
					eq(files.folderId, folderId),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
				),
			)
			.limit(1),
		db
			.select({ id: folders.id })
			.from(folders)
			.where(
				and(
					eq(folders.providerId, providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.workspaceId, workspaceId),
					eq(folders.parentId, folderId),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
				),
			)
			.limit(1),
	]);

	return childFiles.length > 0 || childFolders.length > 0;
}
