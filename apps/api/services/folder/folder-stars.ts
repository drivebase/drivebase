import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { getFolder } from "./folder-queries";

/**
 * Star a folder
 */
export async function starFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
) {
	await getFolder(db, folderId, userId, workspaceId);

	const [updated] = await db
		.update(folders)
		.set({
			starred: true,
			updatedAt: new Date(),
		})
		.where(eq(folders.id, folderId))
		.returning();

	if (!updated) {
		throw new Error("Failed to star folder");
	}

	return updated;
}

/**
 * Unstar a folder
 */
export async function unstarFolder(
	db: Database,
	folderId: string,
	userId: string,
	workspaceId: string,
) {
	await getFolder(db, folderId, userId, workspaceId);

	const [updated] = await db
		.update(folders)
		.set({
			starred: false,
			updatedAt: new Date(),
		})
		.where(eq(folders.id, folderId))
		.returning();

	if (!updated) {
		throw new Error("Failed to unstar folder");
	}

	return updated;
}
