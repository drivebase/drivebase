import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { fileRules } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { logger } from "@/utils/logger";
import type { UpdateRuleInput } from "../shared/types";
import { validateConditions, validateProvider } from "../shared/validation";

// Update rule fields and validation-sensitive values.
export async function updateRule(
	db: Database,
	ruleId: string,
	workspaceId: string,
	input: UpdateRuleInput,
) {
	if (input.conditions) validateConditions(input.conditions);
	if (input.destinationProviderId) {
		await validateProvider(db, input.destinationProviderId, workspaceId);
	}
	if (input.name !== undefined && !input.name.trim()) {
		throw new ValidationError("Rule name is required");
	}

	const set: Record<string, unknown> = { updatedAt: new Date() };
	if (input.name !== undefined) set.name = input.name.trim();
	if (input.conditions !== undefined) set.conditions = input.conditions;
	if (input.destinationProviderId !== undefined) {
		set.destinationProviderId = input.destinationProviderId;
	}
	if (input.destinationFolderId !== undefined) {
		set.destinationFolderId = input.destinationFolderId;
	}
	if (input.enabled !== undefined) set.enabled = input.enabled;

	const [rule] = await db
		.update(fileRules)
		.set(set)
		.where(
			and(
				eq(fileRules.id, ruleId),
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.isDeleted, false),
			),
		)
		.returning();

	if (!rule) throw new NotFoundError("File rule not found");
	logger.debug({ msg: "File rule updated", ruleId: rule.id });
	return rule;
}
