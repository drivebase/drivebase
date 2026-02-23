import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

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
				isNull(folders.vaultId),
			),
		)
		.limit(1);

	if (!folder) {
		throw new NotFoundError("Folder");
	}

	return folder;
}

/**
 * List folders by parent and optional provider filter
 */
export async function listFolders(
	db: Database,
	_userId: string,
	workspaceId: string,
	parentId?: string,
	providerIds?: string[],
) {
	const conditions = [
		eq(folders.isDeleted, false),
		eq(folders.workspaceId, workspaceId),
		isNull(folders.vaultId),
	];

	if (parentId) {
		conditions.push(eq(folders.parentId, parentId));
	} else {
		conditions.push(isNull(folders.parentId));
	}

	if (providerIds && providerIds.length > 0) {
		conditions.push(inArray(folders.providerId, providerIds));
	}

	return db
		.select()
		.from(folders)
		.where(and(...conditions))
		.orderBy(folders.name);
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
				isNull(folders.vaultId),
			),
		)
		.orderBy(folders.name);
}
