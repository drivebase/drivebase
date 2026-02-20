import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	fileRules,
	type NewFileRule,
	type RuleConditionGroups,
	storageProviders,
} from "@drivebase/db";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../../utils/logger";

interface CreateRuleInput {
	name: string;
	conditions: RuleConditionGroups;
	destinationProviderId: string;
	destinationFolderId?: string;
	enabled?: boolean;
}

interface UpdateRuleInput {
	name?: string;
	conditions?: RuleConditionGroups;
	destinationProviderId?: string;
	destinationFolderId?: string | null;
	enabled?: boolean;
}

/**
 * Create a new file rule
 */
export async function createRule(
	db: Database,
	workspaceId: string,
	userId: string,
	input: CreateRuleInput,
) {
	validateConditions(input.conditions);
	await validateProvider(db, input.destinationProviderId, workspaceId);

	if (!input.name.trim()) {
		throw new ValidationError("Rule name is required");
	}

	// Get the next priority (append at end)
	const [maxPriority] = await db
		.select({ max: sql<number>`COALESCE(MAX(${fileRules.priority}), -1)` })
		.from(fileRules)
		.where(
			and(
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.isDeleted, false),
			),
		);

	const priority = (maxPriority?.max ?? -1) + 1;

	const values: NewFileRule = {
		name: input.name.trim(),
		priority,
		enabled: input.enabled ?? true,
		conditions: input.conditions,
		destinationProviderId: input.destinationProviderId,
		destinationFolderId: input.destinationFolderId ?? null,
		workspaceId,
		createdBy: userId,
	};

	const [rule] = await db.insert(fileRules).values(values).returning();

	if (!rule) {
		throw new Error("Failed to create file rule");
	}

	logger.debug({ msg: "File rule created", ruleId: rule.id, name: rule.name });
	return rule;
}

/**
 * Update an existing file rule
 */
export async function updateRule(
	db: Database,
	ruleId: string,
	workspaceId: string,
	input: UpdateRuleInput,
) {
	if (input.conditions) {
		validateConditions(input.conditions);
	}

	if (input.destinationProviderId) {
		await validateProvider(db, input.destinationProviderId, workspaceId);
	}

	if (input.name !== undefined && !input.name.trim()) {
		throw new ValidationError("Rule name is required");
	}

	const set: Record<string, unknown> = { updatedAt: new Date() };
	if (input.name !== undefined) set.name = input.name.trim();
	if (input.conditions !== undefined) set.conditions = input.conditions;
	if (input.destinationProviderId !== undefined)
		set.destinationProviderId = input.destinationProviderId;
	if (input.destinationFolderId !== undefined)
		set.destinationFolderId = input.destinationFolderId;
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

	if (!rule) {
		throw new NotFoundError("File rule not found");
	}

	logger.debug({ msg: "File rule updated", ruleId: rule.id });
	return rule;
}

/**
 * Soft-delete a file rule
 */
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

	if (!rule) {
		throw new NotFoundError("File rule not found");
	}

	logger.debug({ msg: "File rule deleted", ruleId: rule.id });
	return true;
}

/**
 * Reorder rules by setting priorities based on the ordered list of IDs
 */
export async function reorderRules(
	db: Database,
	workspaceId: string,
	orderedIds: string[],
) {
	const updates = orderedIds.map((id, index) =>
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
	);

	await Promise.all(updates);

	// Return all rules in new order
	const { listRules } = await import("./rule-queries");
	return listRules(db, workspaceId);
}

function validateConditions(conditions: RuleConditionGroups) {
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

async function validateProvider(
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
