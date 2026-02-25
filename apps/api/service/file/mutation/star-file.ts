import type { Database } from "@drivebase/db";
import { files } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { logger } from "../../../utils/logger";
import { getFile } from "../query";

// Mark a file as starred after access validation.
export async function starFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Starring file", userId, fileId });
	try {
		await getFile(db, fileId, userId, workspaceId);
		const [updated] = await db
			.update(files)
			.set({ starred: true, updatedAt: new Date() })
			.where(and(eq(files.id, fileId), eq(files.nodeType, "file")))
			.returning();
		if (!updated) throw new Error("Failed to star file");
		return updated;
	} catch (error) {
		logger.error({ msg: "Star file failed", userId, fileId, error });
		throw error;
	}
}

// Remove star flag after access validation.
export async function unstarFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Unstarring file", userId, fileId });
	try {
		await getFile(db, fileId, userId, workspaceId);
		const [updated] = await db
			.update(files)
			.set({ starred: false, updatedAt: new Date() })
			.where(and(eq(files.id, fileId), eq(files.nodeType, "file")))
			.returning();
		if (!updated) throw new Error("Failed to unstar file");
		return updated;
	} catch (error) {
		logger.error({ msg: "Unstar file failed", userId, fileId, error });
		throw error;
	}
}
