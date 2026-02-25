import { ValidationError } from "@drivebase/core";
import type { Database, NewFileRule } from "@drivebase/db";
import { fileRules } from "@drivebase/db";
import { and, eq, sql } from "drizzle-orm";
import { telemetry } from "@/telemetry";
import { logger } from "@/utils/logger";
import type { CreateRuleInput } from "../shared/types";
import { validateConditions, validateProvider } from "../shared/validation";

// Create a rule and append it at the end of priority list.
export async function createRule(
	db: Database,
	workspaceId: string,
	userId: string,
	input: CreateRuleInput,
) {
	validateConditions(input.conditions);
	await validateProvider(db, input.destinationProviderId, workspaceId);
	if (!input.name.trim()) throw new ValidationError("Rule name is required");

	const [maxPriority] = await db
		.select({ max: sql<number>`COALESCE(MAX(${fileRules.priority}), -1)` })
		.from(fileRules)
		.where(
			and(
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.isDeleted, false),
			),
		);

	const values: NewFileRule = {
		name: input.name.trim(),
		priority: (maxPriority?.max ?? -1) + 1,
		enabled: input.enabled ?? true,
		conditions: input.conditions,
		destinationProviderId: input.destinationProviderId,
		destinationFolderId: input.destinationFolderId ?? null,
		workspaceId,
		createdBy: userId,
	};

	const [rule] = await db.insert(fileRules).values(values).returning();
	if (!rule) throw new Error("Failed to create file rule");

	logger.debug({ msg: "File rule created", ruleId: rule.id, name: rule.name });
	telemetry.capture("file_rule_created");
	return rule;
}
