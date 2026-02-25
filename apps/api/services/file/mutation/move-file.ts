import { ConflictError, joinPath, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../../../utils/logger";
import { ActivityService } from "../../activity";
import { FolderService } from "../../folder";
import { ProviderService } from "../../provider";
import { getWorkspaceSyncOperationsToProvider } from "../../workspace/workspace";
import { getFile } from "../query/file-read";

// Move a file within workspace folders and optionally provider-side.
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
			newFolder = await new FolderService(db).getFolder(
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

		if (!updated) throw new Error("Failed to move file");

		await new ActivityService(db).log({
			type: "move",
			userId,
			workspaceId,
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
