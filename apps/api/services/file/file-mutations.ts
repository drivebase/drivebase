import {
	ConflictError,
	getParentPath,
	joinPath,
	sanitizeFilename,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { telemetry } from "../../telemetry";
import { logger } from "../../utils/logger";
import { ActivityService } from "../activity";
import { FolderService } from "../folder";
import { ProviderService } from "../provider";
import { getWorkspaceSyncOperationsToProvider } from "../workspace/workspace";
import { getFile } from "./file-queries";

/**
 * Rename a file
 */
export async function renameFile(
	db: Database,
	fileId: string,
	userId: string,
	newName: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Renaming file", userId, fileId, newName });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);

		const sanitizedName = sanitizeFilename(newName);

		if (!sanitizedName) {
			throw new ValidationError("File name is required");
		}

		const parentPath = getParentPath(file.virtualPath);
		const newVirtualPath = joinPath(parentPath, sanitizedName);

		const [existing] = await db
			.select({ id: files.id })
			.from(files)
			.innerJoin(storageProviders, eq(files.providerId, storageProviders.id))
			.where(
				and(
					eq(files.virtualPath, newVirtualPath),
					eq(files.nodeType, "file"),
					eq(storageProviders.workspaceId, workspaceId),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (existing && existing.id !== fileId) {
			throw new ConflictError(`File already exists at path: ${newVirtualPath}`);
		}

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		await provider.move({
			remoteId: file.remoteId,
			newName: sanitizedName,
		});

		await provider.cleanup();

		const [updated] = await db
			.update(files)
			.set({
				name: sanitizedName,
				virtualPath: newVirtualPath,
				updatedAt: new Date(),
			})
			.where(eq(files.id, fileId))
			.returning();

		if (!updated) {
			throw new Error("Failed to rename file");
		}

		logger.debug({
			msg: "File renamed",
			fileId,
			oldName: file.name,
			newName: sanitizedName,
		});

		const activityService = new ActivityService(db);
		await activityService.log({
			type: "update",
			userId,
			fileId: updated.id,
			providerId: updated.providerId,
			folderId: updated.folderId ?? undefined,
			metadata: {
				action: "rename",
				oldName: file.name,
				newName: sanitizedName,
			},
		});

		return updated;
	} catch (error) {
		logger.error({
			msg: "Rename file failed",
			userId,
			fileId,
			newName,
			error,
		});
		throw error;
	}
}

/**
 * Move file to a different folder
 */
export async function moveFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
	newFolderId?: string,
) {
	logger.debug({ msg: "Moving file", userId, fileId, newFolderId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);
		const syncOperationsToProvider = await getWorkspaceSyncOperationsToProvider(
			db,
			workspaceId,
		);

		let newFolder = null;
		let newVirtualPath: string;

		if (newFolderId) {
			const folderService = new FolderService(db);
			newFolder = await folderService.getFolder(
				newFolderId,
				userId,
				workspaceId,
			);
			newVirtualPath = joinPath(newFolder.virtualPath, file.name);
		} else {
			newVirtualPath = joinPath("/", file.name);
		}

		if (
			syncOperationsToProvider &&
			newFolder &&
			newFolder.providerId !== file.providerId
		) {
			throw new ValidationError(
				"Cannot sync move to a folder on a different provider",
			);
		}

		const [existing] = await db
			.select({ id: files.id })
			.from(files)
			.innerJoin(storageProviders, eq(files.providerId, storageProviders.id))
			.where(
				and(
					eq(files.virtualPath, newVirtualPath),
					eq(files.nodeType, "file"),
					eq(storageProviders.workspaceId, workspaceId),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (existing && existing.id !== fileId) {
			throw new ConflictError(`File already exists at path: ${newVirtualPath}`);
		}

		if (syncOperationsToProvider) {
			const providerService = new ProviderService(db);
			const providerRecord = await providerService.getProvider(
				file.providerId,
				userId,
				workspaceId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			try {
				await provider.move({
					remoteId: file.remoteId,
					newParentId: newFolder?.remoteId,
				});
			} finally {
				await provider.cleanup();
			}
		}

		const [updated] = await db
			.update(files)
			.set({
				folderId: newFolderId ?? null,
				virtualPath: newVirtualPath,
				updatedAt: new Date(),
			})
			.where(eq(files.id, fileId))
			.returning();

		if (!updated) {
			throw new Error("Failed to move file");
		}

		logger.debug({
			msg: "File moved",
			fileId,
			oldPath: file.virtualPath,
			newPath: newVirtualPath,
		});

		const activityService = new ActivityService(db);
		await activityService.log({
			type: "move",
			userId,
			fileId: updated.id,
			providerId: updated.providerId,
			folderId: updated.folderId ?? undefined,
			metadata: {
				action: "move_folder",
				oldPath: file.virtualPath,
				newPath: newVirtualPath,
				fromFolderId: file.folderId,
				toFolderId: updated.folderId,
			},
		});

		return updated;
	} catch (error) {
		logger.error({
			msg: "Move file failed",
			userId,
			fileId,
			newFolderId,
			error,
		});
		throw error;
	}
}

/**
 * Delete a file
 */
export async function deleteFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Deleting file", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		await provider.delete({
			remoteId: file.remoteId,
			isFolder: false,
		});

		await provider.cleanup();

		await db
			.delete(files)
			.where(and(eq(files.id, fileId), eq(files.nodeType, "file")));

		logger.debug({ msg: "File deleted", fileId });
		telemetry.capture("file_deleted");

		const activityService = new ActivityService(db);
		await activityService.log({
			type: "delete",
			userId,
			fileId,
			providerId: file.providerId,
			folderId: file.folderId ?? undefined,
			metadata: {
				name: file.name,
				virtualPath: file.virtualPath,
			},
		});
	} catch (error) {
		logger.error({ msg: "Delete file failed", userId, fileId, error });
		throw error;
	}
}
