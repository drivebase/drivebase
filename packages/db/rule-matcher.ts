import type {
	FileRule,
	RuleCondition,
	RuleConditionGroup,
	RuleConditionGroups,
	RuleConditionOperator,
} from "./schema";

export interface FileAttributes {
	name: string;
	mimeType: string;
	size: number;
}

/**
 * Return the first enabled rule (sorted by priority) whose conditions match
 * the file and whose destination provider is in the provided active-provider set.
 *
 * Rules are evaluated in priority order (lower number = higher priority).
 * Groups within a rule are OR-ed; conditions within a group are AND-ed.
 */
export function matchFileRule(
	rules: FileRule[],
	file: FileAttributes,
	activeProviderIds: Set<string>,
): FileRule | null {
	const sorted = [...rules]
		.filter((r) => r.enabled && !r.isDeleted)
		.sort((a, b) => a.priority - b.priority);

	for (const rule of sorted) {
		if (
			activeProviderIds.has(rule.destinationProviderId) &&
			matchesRule(rule.conditions, file)
		) {
			return rule;
		}
	}

	return null;
}

/**
 * Returns true when the file's attributes satisfy the rule's condition groups.
 */
export function matchesRule(
	conditions: RuleConditionGroups,
	file: FileAttributes,
): boolean {
	const { groups } = conditions;
	if (!groups || groups.length === 0) return false;
	return groups.some((group) => matchesGroup(group, file));
}

function matchesGroup(
	group: RuleConditionGroup,
	file: FileAttributes,
): boolean {
	if (!group.conditions || group.conditions.length === 0) return false;
	return group.conditions.every((c) => matchesCondition(c, file));
}

function matchesCondition(
	condition: RuleCondition,
	file: FileAttributes,
): boolean {
	const { field, operator, value } = condition;
	switch (field) {
		case "extension":
			return matchString(extractExtension(file.name), operator, value);
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
	if (lastDot === -1 || lastDot === filename.length - 1) return "";
	return filename.slice(lastDot + 1).toLowerCase();
}

function matchString(
	actual: string,
	operator: RuleConditionOperator,
	value: string | number | string[],
): boolean {
	const normalized = actual.toLowerCase();
	switch (operator) {
		case "equals":
			return normalized === String(value).toLowerCase();
		case "notEquals":
			return normalized !== String(value).toLowerCase();
		case "contains":
			return normalized.includes(String(value).toLowerCase());
		case "startsWith":
			return normalized.startsWith(String(value).toLowerCase());
		case "endsWith":
			return normalized.endsWith(String(value).toLowerCase());
		case "in": {
			const values = Array.isArray(value) ? value : String(value).split(",");
			return values.some((v) => normalized === v.trim().toLowerCase());
		}
		default:
			return false;
	}
}

function matchNumeric(
	actual: number,
	operator: RuleConditionOperator,
	value: string | number | string[],
): boolean {
	const numValue = Number(value);
	if (Number.isNaN(numValue)) return false;
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
