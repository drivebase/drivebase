import type { RuleConditionGroups } from "@drivebase/db";

export interface CreateRuleInput {
	name: string;
	conditions: RuleConditionGroups;
	destinationProviderId: string;
	destinationFolderId?: string;
	enabled?: boolean;
}

export interface UpdateRuleInput {
	name?: string;
	conditions?: RuleConditionGroups;
	destinationProviderId?: string;
	destinationFolderId?: string | null;
	enabled?: boolean;
}
