import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { fileRules } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { logger } from "@/utils/logger";

// Soft-delete a rule by marking isDeleted.
export async function deleteRule(
	db: Database,
	ruleId: string,
	workspaceId: string,
) {
	const [rule] = await db
		.update(fileRules)
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(
			and(
				eq(fileRules.id, ruleId),
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.isDeleted, false),
			),
		)
		.returning();

	if (!rule) throw new NotFoundError("File rule not found");
	logger.debug({ msg: "File rule deleted", ruleId: rule.id });
	return true;
}
