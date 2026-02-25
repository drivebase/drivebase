import { ValidationError } from "@drivebase/core";
import type { Database, RuleConditionGroups } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

// Validate rule condition groups and operators.
export function validateConditions(conditions: RuleConditionGroups) {
	if (!conditions.groups || conditions.groups.length === 0) {
		throw new ValidationError("At least one condition group is required");
	}

	const numericOperators = new Set([
		"greaterThan",
		"lessThan",
		"greaterThanOrEqual",
		"lessThanOrEqual",
	]);

	for (const group of conditions.groups) {
		if (!group.conditions || group.conditions.length === 0) {
			throw new ValidationError(
				"Each condition group must have at least one condition",
			);
		}

		for (const condition of group.conditions) {
			if (
				condition.field !== "size" &&
				numericOperators.has(condition.operator)
			) {
				throw new ValidationError(
					`Operator "${condition.operator}" is only valid for the "size" field`,
				);
			}
		}
	}
}

// Validate destination provider exists and is active.
export async function validateProvider(
	db: Database,
	providerId: string,
	workspaceId: string,
) {
	const [provider] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
				eq(storageProviders.isActive, true),
			),
		)
		.limit(1);

	if (!provider) {
		throw new ValidationError("Destination provider not found or is inactive");
	}
}
