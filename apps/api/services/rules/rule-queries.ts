import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { fileRules } from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";

/**
 * List all non-deleted rules for a workspace, ordered by priority
 */
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

/**
 * Get a single rule by ID
 */
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

	if (!rule) {
		throw new NotFoundError("File rule not found");
	}

	return rule;
}
