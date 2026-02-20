/**
 * Re-exports rule matching utilities from @drivebase/utils.
 * The full `FileRule` DB type is structurally compatible with `RuleLike`.
 */
export {
	type FileAttributes,
	matchesRule,
	matchFileRule,
	type RuleCondition,
	type RuleConditionField,
	type RuleConditionGroup,
	type RuleConditionGroups,
	type RuleConditionOperator,
	type RuleLike,
} from "@drivebase/utils";
