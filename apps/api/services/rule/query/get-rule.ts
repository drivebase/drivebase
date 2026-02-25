import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { fileRules } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

// Fetch one rule by id in workspace.
export async function getRule(
	db: Database,
	ruleId: string,
	workspaceId: string,
) {
	const [rule] = await db
		.select()
		.from(fileRules)
		.where(
			and(
				eq(fileRules.id, ruleId),
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.isDeleted, false),
			),
		)
		.limit(1);

	if (!rule) throw new NotFoundError("File rule not found");
	return rule;
}
