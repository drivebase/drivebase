import {
	ConflictError,
	getParentPath,
	joinPath,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { ProviderService } from "@/service/provider";
import { getWorkspaceSyncOperationsToProvider } from "@/service/workspace";
import { getFolder } from "../query";
import { updateDescendantVirtualPaths } from "./shared";

// Rename a folder and update descendant paths.
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

	await updateDescendantVirtualPaths(db, folder.virtualPath, newVirtualPath);
	return updated;
}
