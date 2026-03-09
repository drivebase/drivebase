import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

// Return starred folders for the workspace.
export async function getStarredFolders(
	db: Database,
	_userId: string,
	workspaceId: string,
	allowedProviderIds?: string[] | null,
) {
	const conditions = [
		eq(folders.nodeType, "folder"),
		eq(folders.starred, true),
		eq(folders.isDeleted, false),
		eq(folders.workspaceId, workspaceId),
		isNull(folders.vaultId),
	];
	if (allowedProviderIds) {
		conditions.push(inArray(folders.providerId, allowedProviderIds));
	}
	return db
		.select()
		.from(folders)
		.where(and(...conditions))
		.orderBy(folders.name);
}
