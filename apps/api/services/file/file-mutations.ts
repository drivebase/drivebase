import {
	ConflictError,
	getParentPath,
	joinPath,
	sanitizeFilename,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { FolderService } from "../folder";
import { ProviderService } from "../provider";
import { getFile } from "./file-queries";

/**
 * Rename a file
 */
export async function renameFile(
	db: Database,
	fileId: string,
	userId: string,
	newName: string,
) {
	logger.debug({ msg: "Renaming file", userId, fileId, newName });

	try {
		const file = await getFile(db, fileId, userId);

		const sanitizedName = sanitizeFilename(newName);

		if (!sanitizedName) {
			throw new ValidationError("File name is required");
		}

		const parentPath = getParentPath(file.virtualPath);
		const newVirtualPath = joinPath(parentPath, sanitizedName);

		const [existing] = await db
			.select()
			.from(files)
			.where(
				and(eq(files.virtualPath, newVirtualPath), eq(files.isDeleted, false)),
			)
			.limit(1);

		if (existing && existing.id !== fileId) {
			throw new ConflictError(`File already exists at path: ${newVirtualPath}`);
		}

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
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
	newFolderId?: string,
) {
	logger.debug({ msg: "Moving file", userId, fileId, newFolderId });

	try {
		const file = await getFile(db, fileId, userId);

		let newFolder = null;
		let newVirtualPath: string;

		if (newFolderId) {
			const folderService = new FolderService(db);
			newFolder = await folderService.getFolder(newFolderId, userId);
			newVirtualPath = joinPath(newFolder.virtualPath, file.name);
		} else {
			newVirtualPath = joinPath("/", file.name);
		}

		const [existing] = await db
			.select()
			.from(files)
			.where(
				and(eq(files.virtualPath, newVirtualPath), eq(files.isDeleted, false)),
			)
			.limit(1);

		if (existing && existing.id !== fileId) {
			throw new ConflictError(`File already exists at path: ${newVirtualPath}`);
		}

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		await provider.move({
			remoteId: file.remoteId,
			newParentId: newFolder?.remoteId ?? undefined,
		});

		await provider.cleanup();

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
 * Delete a file (soft delete)
 */
export async function deleteFile(db: Database, fileId: string, userId: string) {
	logger.debug({ msg: "Deleting file", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId);

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		await provider.delete({
			remoteId: file.remoteId,
			isFolder: false,
		});

		await provider.cleanup();

		await db
			.update(files)
			.set({
				isDeleted: true,
				updatedAt: new Date(),
			})
			.where(eq(files.id, fileId));

		logger.debug({ msg: "File deleted", fileId });
	} catch (error) {
		logger.error({ msg: "Delete file failed", userId, fileId, error });
		throw error;
	}
}
