import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { ProviderService } from "@/service/provider";
import { getFolder } from "../query";

// Delete a folder remotely and soft-delete it in DB.
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
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(eq(folders.id, folderId));
}
