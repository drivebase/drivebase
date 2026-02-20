import {
	ConflictError,
	getParentPath,
	joinPath,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { and, eq, like, sql } from "drizzle-orm";
import { getFolder } from "./folder-queries";

/**
 * Create a new folder (DB-only, no provider interaction)
 */
export async function createFolder(
	db: Database,
	userId: string,
	workspaceId: string,
	name: string,
	parentId?: string,
) {
	if (!name || name.trim().length === 0) {
		throw new ValidationError("Folder name is required");
	}

	const sanitizedName = name.trim().replace(/[/\\]/g, "_");

	let virtualPath: string;

	if (parentId) {
		const parentFolder = await getFolder(db, parentId, userId, workspaceId);
		virtualPath = joinPath(parentFolder.virtualPath, sanitizedName);
	} else {
		virtualPath = joinPath("/", sanitizedName);
	}

	const [existing] = await db
		.select()
		.from(folders)
		.where(
			and(eq(folders.virtualPath, virtualPath), eq(folders.isDeleted, false)),
		)
		.limit(1);

	if (existing) {
		throw new ConflictError(`Folder already exists at path: ${virtualPath}`);
	}

	const [folder] = await db
		.insert(folders)
		.values({
			virtualPath,
			name: sanitizedName,
			workspaceId,
			parentId: parentId ?? null,
			createdBy: userId,
			isDeleted: false,
		})
		.returning();

	if (!folder) {
		throw new Error("Failed to create folder");
	}

	return folder;
}

/**
 * Rename a folder
 */
export async function renameFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
	newName: string,
) {
	const folder = await getFolder(db, folderId, userId, workspaceId);

	const sanitizedName = newName.trim().replace(/[/\\]/g, "_");

	if (!sanitizedName) {
		throw new ValidationError("Folder name is required");
	}

	const parentPath = getParentPath(folder.virtualPath);
	const newVirtualPath = joinPath(parentPath, sanitizedName);

	const [existing] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.virtualPath, newVirtualPath),
				eq(folders.isDeleted, false),
			),
		)
		.limit(1);

	if (existing && existing.id !== folderId) {
		throw new ConflictError(`Folder already exists at path: ${newVirtualPath}`);
	}

	const [updated] = await db
		.update(folders)
		.set({
			name: sanitizedName,
			virtualPath: newVirtualPath,
			updatedAt: new Date(),
		})
		.where(eq(folders.id, folderId))
		.returning();

	if (!updated) {
		throw new Error("Failed to rename folder");
	}

	// Cascade virtualPath update to all descendant folders and files
	const oldPathPrefix = `${folder.virtualPath}/`;
	const newPathPrefix = `${newVirtualPath}/`;
	const prefixLength = oldPathPrefix.length;

	await db
		.update(folders)
		.set({
			virtualPath: sql`${newPathPrefix} || SUBSTR(${folders.virtualPath}, ${prefixLength + 1})`,
			updatedAt: new Date(),
		})
		.where(
			and(
				like(folders.virtualPath, `${oldPathPrefix}%`),
				eq(folders.isDeleted, false),
			),
		);

	await db
		.update(files)
		.set({
			virtualPath: sql`${newPathPrefix} || SUBSTR(${files.virtualPath}, ${prefixLength + 1})`,
			updatedAt: new Date(),
		})
		.where(
			and(
				like(files.virtualPath, `${oldPathPrefix}%`),
				eq(files.isDeleted, false),
			),
		);

	return updated;
}

/**
 * Move folder to a different parent
 */
export async function moveFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
	newParentId?: string,
) {
	const folder = await getFolder(db, folderId, userId, workspaceId);

	let newVirtualPath: string;

	if (newParentId) {
		const newParent = await getFolder(db, newParentId, userId, workspaceId);
		newVirtualPath = joinPath(newParent.virtualPath, folder.name);
	} else {
		newVirtualPath = joinPath("/", folder.name);
	}

	const [existing] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.virtualPath, newVirtualPath),
				eq(folders.isDeleted, false),
			),
		)
		.limit(1);

	if (existing && existing.id !== folderId) {
		throw new ConflictError(`Folder already exists at path: ${newVirtualPath}`);
	}

	const [updated] = await db
		.update(folders)
		.set({
			parentId: newParentId ?? null,
			virtualPath: newVirtualPath,
			updatedAt: new Date(),
		})
		.where(eq(folders.id, folderId))
		.returning();

	if (!updated) {
		throw new Error("Failed to move folder");
	}

	// Cascade virtualPath update to all descendant folders and files
	const oldPathPrefix = `${folder.virtualPath}/`;
	const newPathPrefix = `${newVirtualPath}/`;
	const prefixLength = oldPathPrefix.length;

	await db
		.update(folders)
		.set({
			virtualPath: sql`${newPathPrefix} || SUBSTR(${folders.virtualPath}, ${prefixLength + 1})`,
			updatedAt: new Date(),
		})
		.where(
			and(
				like(folders.virtualPath, `${oldPathPrefix}%`),
				eq(folders.isDeleted, false),
			),
		);

	await db
		.update(files)
		.set({
			virtualPath: sql`${newPathPrefix} || SUBSTR(${files.virtualPath}, ${prefixLength + 1})`,
			updatedAt: new Date(),
		})
		.where(
			and(
				like(files.virtualPath, `${oldPathPrefix}%`),
				eq(files.isDeleted, false),
			),
		);

	return updated;
}

/**
 * Delete a folder (soft delete, DB-only)
 */
export async function deleteFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
) {
	await getFolder(db, folderId, userId, workspaceId);

	await db
		.update(folders)
		.set({
			isDeleted: true,
			updatedAt: new Date(),
		})
		.where(eq(folders.id, folderId));
}
