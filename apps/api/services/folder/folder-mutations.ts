import {
	ConflictError,
	getParentPath,
	joinPath,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { and, eq, like, sql } from "drizzle-orm";
import { ProviderService } from "../../services/provider";
import { getWorkspaceSyncOperationsToProvider } from "../../services/workspace";
import { getFolder } from "./folder-queries";

/**
 * Create a new folder on the provider and in the DB
 */
export async function createFolder(
	db: Database,
	userId: string,
	workspaceId: string,
	name: string,
	providerId: string,
	parentId?: string,
) {
	if (!name || name.trim().length === 0) {
		throw new ValidationError("Folder name is required");
	}

	const sanitizedName = name.trim().replace(/[/\\]/g, "_");

	const providerService = new ProviderService(db);
	const providerRecord = await providerService.getProvider(
		providerId,
		userId,
		workspaceId,
	);
	const provider = await providerService.getProviderInstance(providerRecord);

	try {
		// Determine the remote parent ID and virtual path
		let remoteParentId: string | undefined;
		let virtualPath: string;

		if (parentId) {
			const parentFolder = await getFolder(db, parentId, userId, workspaceId);
			remoteParentId = parentFolder.remoteId;
			virtualPath = joinPath(parentFolder.virtualPath, sanitizedName);
		} else {
			remoteParentId = undefined;
			virtualPath = joinPath("/", sanitizedName);
		}

		// Create the folder on the remote provider
		const remoteId = await provider.createFolder({
			name: sanitizedName,
			parentId: remoteParentId,
		});

		// Insert the folder into the DB
		const [folder] = await db
			.insert(folders)
			.values({
				nodeType: "folder",
				virtualPath,
				name: sanitizedName,
				remoteId,
				providerId,
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
	} finally {
		await provider.cleanup();
	}
}

/**
 * Rename a folder and optionally sync to provider
 */
export async function renameFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
	newName: string,
) {
	const folder = await getFolder(db, folderId, userId, workspaceId);
	const syncOperationsToProvider = await getWorkspaceSyncOperationsToProvider(
		db,
		workspaceId,
	);

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
				eq(folders.nodeType, "folder"),
				eq(folders.workspaceId, workspaceId),
				eq(folders.isDeleted, false),
			),
		)
		.limit(1);

	if (existing && existing.id !== folderId) {
		throw new ConflictError(`Folder already exists at path: ${newVirtualPath}`);
	}

	if (syncOperationsToProvider) {
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			folder.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		try {
			await provider.move({
				remoteId: folder.remoteId,
				newName: sanitizedName,
			});
		} finally {
			await provider.cleanup();
		}
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
				eq(folders.nodeType, "folder"),
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
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
			),
		);

	return updated;
}

/**
 * Move folder to a different parent (must be within the same provider)
 */
export async function moveFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
	newParentId?: string,
) {
	const folder = await getFolder(db, folderId, userId, workspaceId);
	const syncOperationsToProvider = await getWorkspaceSyncOperationsToProvider(
		db,
		workspaceId,
	);

	let newVirtualPath: string;
	let newParentRemoteId: string | undefined;

	if (newParentId) {
		const newParent = await getFolder(db, newParentId, userId, workspaceId);

		// Ensure the target parent is on the same provider
		if (newParent.providerId !== folder.providerId) {
			throw new ValidationError(
				"Cannot move a folder to a parent on a different provider",
			);
		}

		newVirtualPath = joinPath(newParent.virtualPath, folder.name);
		newParentRemoteId = newParent.remoteId;
	} else {
		newVirtualPath = joinPath("/", folder.name);
		newParentRemoteId = undefined;
	}

	const [existing] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.virtualPath, newVirtualPath),
				eq(folders.nodeType, "folder"),
				eq(folders.workspaceId, workspaceId),
				eq(folders.isDeleted, false),
			),
		)
		.limit(1);

	if (existing && existing.id !== folderId) {
		throw new ConflictError(`Folder already exists at path: ${newVirtualPath}`);
	}

	if (syncOperationsToProvider) {
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			folder.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		try {
			await provider.move({
				remoteId: folder.remoteId,
				newParentId: newParentRemoteId,
			});
		} finally {
			await provider.cleanup();
		}
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
				eq(folders.nodeType, "folder"),
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
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
			),
		);

	return updated;
}

/**
 * Delete a folder (deletes on the remote provider, then soft-deletes in DB)
 */
export async function deleteFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
) {
	const folder = await getFolder(db, folderId, userId, workspaceId);

	const providerService = new ProviderService(db);
	const providerRecord = await providerService.getProvider(
		folder.providerId,
		userId,
		workspaceId,
	);
	const provider = await providerService.getProviderInstance(providerRecord);

	try {
		await provider.delete({ remoteId: folder.remoteId, isFolder: true });
	} finally {
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
