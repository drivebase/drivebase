import { ValidationError, joinPath } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { ProviderService } from "@/service/provider";
import { getFolder } from "../query";

// Create a folder remotely and persist it in the workspace.
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

		const remoteId = await provider.createFolder({
			name: sanitizedName,
			parentId: remoteParentId,
		});

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
