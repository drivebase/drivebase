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
import { ProviderService } from "../provider";
import { getFolder } from "./folder-queries";

/**
 * Create a new folder
 */
export async function createFolder(
	db: Database,
	userId: string,
	name: string,
	parentId?: string,
	providerId?: string,
) {
	if (!name || name.trim().length === 0) {
		throw new ValidationError("Folder name is required");
	}

	const sanitizedName = name.trim().replace(/[/\\]/g, "_");

	let parentFolder = null;
	let virtualPath: string;

	if (parentId) {
		[parentFolder] = await db
			.select()
			.from(folders)
			.where(and(eq(folders.id, parentId), eq(folders.isDeleted, false)))
			.limit(1);

		if (!parentFolder) {
			throw new NotFoundError("Parent folder");
		}

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

	let remoteId: string | undefined;

	if (providerId) {
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			providerId,
			userId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		const parentRemoteId =
			parentFolder?.remoteId ?? providerRecord.rootFolderId ?? undefined;

		remoteId = await provider.createFolder({
			name: sanitizedName,
			parentId: parentRemoteId,
		});

		await provider.cleanup();
	}

	const [folder] = await db
		.insert(folders)
		.values({
			virtualPath,
			name: sanitizedName,
			remoteId: remoteId ?? null,
			providerId: providerId ?? null,
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
	newName: string,
) {
	const folder = await getFolder(db, folderId, userId);

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

	if (folder.providerId && folder.remoteId) {
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			folder.providerId,
			userId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		await provider.move({
			remoteId: folder.remoteId,
			newName: sanitizedName,
		});

		await provider.cleanup();
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
	newParentId?: string,
) {
	const folder = await getFolder(db, folderId, userId);

	let newParent = null;
	let newVirtualPath: string;

	if (newParentId) {
		newParent = await getFolder(db, newParentId, userId);
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
 * Delete a folder (soft delete)
 */
export async function deleteFolder(
	db: Database,
	folderId: string,
	userId: string,
) {
	const folder = await getFolder(db, folderId, userId);

	if (folder.providerId && folder.remoteId) {
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			folder.providerId,
			userId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		await provider.delete({
			remoteId: folder.remoteId,
			isFolder: true,
		});

		await provider.cleanup();
	}

	await db
		.update(folders)
		.set({
			isDeleted: true,
			updatedAt: new Date(),
		})
		.where(eq(folders.id, folderId));
}
