import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { getFolder } from "../query";

// Remove starred mark from a folder.
export async function unstarFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
) {
	await getFolder(db, folderId, userId, workspaceId);

	const [updated] = await db
		.update(folders)
		.set({ starred: false, updatedAt: new Date() })
		.where(and(eq(folders.id, folderId), eq(folders.nodeType, "folder")))
		.returning();

	if (!updated) {
		throw new Error("Failed to unstar folder");
	}

	return updated;
}
