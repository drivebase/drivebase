import { NotFoundError, normalizePath } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders, storageProviders } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";

/**
 * Get folder by ID
 */
export async function getFolder(
	db: Database,
	folderId: string,
	_userId: string,
	workspaceId: string,
) {
	const [folder] = await db
		.select({ folder: folders })
		.from(folders)
		.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.isDeleted, false),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!folder?.folder) {
		throw new NotFoundError("Folder");
	}

	return folder.folder;
}

/**
 * List folders in a path or parent
 */
export async function listFolders(
	db: Database,
	_userId: string,
	workspaceId: string,
	path?: string,
	parentId?: string,
) {
	if (parentId) {
		return db
			.select({ folder: folders })
			.from(folders)
			.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
			.where(
				and(
					eq(folders.parentId, parentId),
					eq(folders.isDeleted, false),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.orderBy(folders.name)
			.then((rows) => rows.map((row) => row.folder));
	} else if (path) {
		const normalizedPath = normalizePath(path);
		return db
			.select({ folder: folders })
			.from(folders)
			.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
			.where(
				and(
					eq(folders.virtualPath, normalizedPath),
					eq(folders.isDeleted, false),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.orderBy(folders.name)
			.then((rows) => rows.map((row) => row.folder));
	} else {
		return db
			.select({ folder: folders })
			.from(folders)
			.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
			.where(
				and(
					isNull(folders.parentId),
					eq(folders.isDeleted, false),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.orderBy(folders.name)
			.then((rows) => rows.map((row) => row.folder));
	}
}

/**
 * Get starred folders
 */
export async function getStarredFolders(
	db: Database,
	_userId: string,
	workspaceId: string,
) {
	return db
		.select({ folder: folders })
		.from(folders)
		.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
		.where(
			and(
				eq(folders.starred, true),
				eq(folders.isDeleted, false),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.orderBy(folders.name)
		.then((rows) => rows.map((row) => row.folder));
}
