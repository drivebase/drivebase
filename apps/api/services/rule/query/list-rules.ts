import type { Database } from "@drivebase/db";
import { fileRules } from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";

// List all active rules ordered by priority.
export async function listRules(db: Database, workspaceId: string) {
	return db
		.select()
		.from(fileRules)
		.where(
			and(
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.isDeleted, false),
			),
		)
		.orderBy(asc(fileRules.priority));
}
