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
import { logger } from "../../../utils/logger";
import { ActivityService } from "../../activity";
import { ProviderService } from "../../provider";
import { getFile } from "../query/file-read";

// Rename a file on provider and in local metadata.
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
		if (!sanitizedName) throw new ValidationError("File name is required");

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
		await provider.move({ remoteId: file.remoteId, newName: sanitizedName });
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

		if (!updated) throw new Error("Failed to rename file");

		await new ActivityService(db).log({
			type: "update",
			userId,
			workspaceId,
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
		logger.error({ msg: "Rename file failed", userId, fileId, newName, error });
		throw error;
	}
}
