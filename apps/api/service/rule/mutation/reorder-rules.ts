import type { Database } from "@drivebase/db";
import { fileRules } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { listRules } from "../query";

// Reassign priorities based on ordered ids.
export async function reorderRules(
	db: Database,
	workspaceId: string,
	orderedIds: string[],
) {
	await Promise.all(
		orderedIds.map((id, index) =>
			db
				.update(fileRules)
				.set({ priority: index, updatedAt: new Date() })
				.where(
					and(
						eq(fileRules.id, id),
						eq(fileRules.workspaceId, workspaceId),
						eq(fileRules.isDeleted, false),
					),
				),
		),
	);

	return listRules(db, workspaceId);
}
