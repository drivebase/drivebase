import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";

// Fetch one non-deleted folder from the active workspace.
export async function getFolder(
	db: Database,
	folderId: string,
	_userId: string,
	workspaceId: string,
) {
	const [folder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				eq(folders.workspaceId, workspaceId),
				isNull(folders.vaultId),
			),
		)
		.limit(1);

	if (!folder) {
		throw new NotFoundError("Folder");
	}

	return folder;
}
