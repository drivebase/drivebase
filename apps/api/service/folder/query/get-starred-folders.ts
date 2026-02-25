import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";

// Return starred folders for the workspace.
export async function getStarredFolders(
	db: Database,
	_userId: string,
	workspaceId: string,
) {
	return db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.nodeType, "folder"),
				eq(folders.starred, true),
				eq(folders.isDeleted, false),
				eq(folders.workspaceId, workspaceId),
				isNull(folders.vaultId),
			),
		)
		.orderBy(folders.name);
}
