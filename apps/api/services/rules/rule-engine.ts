import type { Database } from "@drivebase/db";
import {
	type FileRule,
	fileRules,
	type RuleCondition,
	type RuleConditionGroup,
	storageProviders,
} from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

interface FileAttributes {
	name: string;
	mimeType: string;
	size: number;
}

/**
 * Evaluate all enabled rules for a workspace and return the first matching rule.
 * Rules are evaluated in priority order (lower number = higher priority).
 */
export async function evaluateRules(
	db: Database,
	workspaceId: string,
	file: FileAttributes,
): Promise<FileRule | null> {
	const rules = await db
		.select({ rule: fileRules, providerActive: storageProviders.isActive })
		.from(fileRules)
		.innerJoin(
			storageProviders,
			eq(fileRules.destinationProviderId, storageProviders.id),
		)
		.where(
			and(
				eq(fileRules.workspaceId, workspaceId),
				eq(fileRules.enabled, true),
				eq(fileRules.isDeleted, false),
			),
		)
		.orderBy(asc(fileRules.priority));

	for (const { rule, providerActive } of rules) {
		if (!providerActive) {
			continue;
		}

		if (matchesRule(rule, file)) {
			logger.debug({
				msg: "File matched rule",
				ruleName: rule.name,
				ruleId: rule.id,
				fileName: file.name,
			});
			return rule;
		}
	}

	return null;
}

/**
 * Check if a file matches a rule (OR between groups)
 */
function matchesRule(rule: FileRule, file: FileAttributes): boolean {
	const { groups } = rule.conditions;
	if (!groups || groups.length === 0) {
		return false;
	}
	return groups.some((group) => matchesGroup(group, file));
}

/**
 * Check if a file matches all conditions in a group (AND within group)
 */
function matchesGroup(
	group: RuleConditionGroup,
	file: FileAttributes,
): boolean {
	if (!group.conditions || group.conditions.length === 0) {
		return false;
	}
	return group.conditions.every((condition) =>
		matchesCondition(condition, file),
	);
}

/**
 * Evaluate a single condition against file attributes
 */
function matchesCondition(
	condition: RuleCondition,
	file: FileAttributes,
): boolean {
	const { field, operator, value } = condition;

	switch (field) {
		case "extension": {
			const ext = extractExtension(file.name);
			return matchString(ext, operator, value);
		}
		case "mimeType":
			return matchString(file.mimeType, operator, value);
		case "name":
			return matchString(file.name, operator, value);
		case "size":
			return matchNumeric(file.size, operator, value);
		default:
			return false;
	}
}

function extractExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1 || lastDot === filename.length - 1) {
		return "";
	}
	return filename.slice(lastDot + 1).toLowerCase();
}

function matchString(
	actual: string,
	operator: string,
	value: string | number | string[],
): boolean {
	const normalizedActual = actual.toLowerCase();

	switch (operator) {
		case "equals":
			return normalizedActual === String(value).toLowerCase();
		case "notEquals":
			return normalizedActual !== String(value).toLowerCase();
		case "contains":
			return normalizedActual.includes(String(value).toLowerCase());
		case "startsWith":
			return normalizedActual.startsWith(String(value).toLowerCase());
		case "endsWith":
			return normalizedActual.endsWith(String(value).toLowerCase());
		case "in": {
			const values = Array.isArray(value) ? value : String(value).split(",");
			return values.some((v) => normalizedActual === v.trim().toLowerCase());
		}
		default:
			return false;
	}
}

function matchNumeric(
	actual: number,
	operator: string,
	value: string | number | string[],
): boolean {
	const numValue = Number(value);
	if (Number.isNaN(numValue)) {
		return false;
	}

	switch (operator) {
		case "equals":
			return actual === numValue;
		case "notEquals":
			return actual !== numValue;
		case "greaterThan":
			return actual > numValue;
		case "lessThan":
			return actual < numValue;
		case "greaterThanOrEqual":
			return actual >= numValue;
		case "lessThanOrEqual":
			return actual <= numValue;
		default:
			return false;
	}
}
