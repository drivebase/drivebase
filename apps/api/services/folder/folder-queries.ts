import { NotFoundError, normalizePath } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
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
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.isDeleted, false),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!folder) {
		throw new NotFoundError("Folder");
	}

	return folder;
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
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.parentId, parentId),
					eq(folders.isDeleted, false),
					eq(folders.workspaceId, workspaceId),
				),
			)
			.orderBy(folders.name);
	} else if (path) {
		const normalizedPath = normalizePath(path);
		return db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.virtualPath, normalizedPath),
					eq(folders.isDeleted, false),
					eq(folders.workspaceId, workspaceId),
				),
			)
			.orderBy(folders.name);
	} else {
		return db
			.select()
			.from(folders)
			.where(
				and(
					isNull(folders.parentId),
					eq(folders.isDeleted, false),
					eq(folders.workspaceId, workspaceId),
				),
			)
			.orderBy(folders.name);
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
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.starred, true),
				eq(folders.isDeleted, false),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.orderBy(folders.name);
}
