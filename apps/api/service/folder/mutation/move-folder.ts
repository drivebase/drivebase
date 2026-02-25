import { ConflictError, joinPath, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { ProviderService } from "@/service/provider";
import { getWorkspaceSyncOperationsToProvider } from "@/service/workspace";
import { getFolder } from "../query";
import { updateDescendantVirtualPaths } from "./shared";

// Move a folder within a provider and update descendant paths.
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

	await updateDescendantVirtualPaths(db, folder.virtualPath, newVirtualPath);
	return updated;
}
