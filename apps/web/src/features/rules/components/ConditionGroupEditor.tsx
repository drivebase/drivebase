import { Trans } from "@lingui/react/macro";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConditionEditor, type RuleCondition } from "./ConditionEditor";

export interface RuleConditionGroup {
	conditions: RuleCondition[];
}

export interface RuleConditionGroups {
	groups: RuleConditionGroup[];
}

function createDefaultCondition(): RuleCondition {
	return { field: "extension", operator: "equals", value: "" };
}

interface ConditionGroupEditorProps {
	conditionGroups: RuleConditionGroups;
	onChange: (groups: RuleConditionGroups) => void;
}

export function ConditionGroupEditor({
	conditionGroups,
	onChange,
}: ConditionGroupEditorProps) {
	const { groups } = conditionGroups;

	const updateGroup = (groupIndex: number, group: RuleConditionGroup) => {
		const newGroups = [...groups];
		newGroups[groupIndex] = group;
		onChange({ groups: newGroups });
	};

	const removeGroup = (groupIndex: number) => {
		onChange({ groups: groups.filter((_, i) => i !== groupIndex) });
	};

	const addGroup = () => {
		onChange({
			groups: [...groups, { conditions: [createDefaultCondition()] }],
		});
	};

	const updateCondition = (
		groupIndex: number,
		condIndex: number,
		condition: RuleCondition,
	) => {
		const group = groups[groupIndex];
		if (!group) return;
		const newConditions = [...group.conditions];
		newConditions[condIndex] = condition;
		updateGroup(groupIndex, { conditions: newConditions });
	};

	const removeCondition = (groupIndex: number, condIndex: number) => {
		const group = groups[groupIndex];
		if (!group) return;
		updateGroup(groupIndex, {
			conditions: group.conditions.filter((_, i) => i !== condIndex),
		});
	};

	const addCondition = (groupIndex: number) => {
		const group = groups[groupIndex];
		if (!group) return;
		updateGroup(groupIndex, {
			conditions: [...group.conditions, createDefaultCondition()],
		});
	};

	return (
		<div className="space-y-4">
			{groups.map((group, groupIndex) => (
				<div key={groupIndex}>
					{groupIndex > 0 && (
						<div className="flex items-center gap-2 py-2">
							<div className="h-px flex-1 bg-border" />
							<span className="text-xs font-medium text-muted-foreground uppercase">
								<Trans>OR</Trans>
							</span>
							<div className="h-px flex-1 bg-border" />
						</div>
					)}

					<div className="rounded-md border p-3 space-y-2">
						<div className="flex items-center justify-between mb-1">
							<span className="text-xs text-muted-foreground">
								<Trans>All conditions must match (AND)</Trans>
							</span>
							{groups.length > 1 && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => removeGroup(groupIndex)}
									className="h-6 text-xs"
								>
									<Trans>Remove group</Trans>
								</Button>
							)}
						</div>

						{group.conditions.map((condition, condIndex) => (
							<ConditionEditor
								key={condIndex}
								condition={condition}
								onChange={(c) => updateCondition(groupIndex, condIndex, c)}
								onRemove={() => removeCondition(groupIndex, condIndex)}
								canRemove={group.conditions.length > 1}
							/>
						))}

						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => addCondition(groupIndex)}
							className="mt-1"
						>
							<Plus className="mr-1 h-3 w-3" />
							<Trans>Add condition</Trans>
						</Button>
					</div>
				</div>
			))}

			<Button type="button" variant="outline" size="sm" onClick={addGroup}>
				<Plus className="mr-1 h-3 w-3" />
				<Trans>Add OR group</Trans>
			</Button>
		</div>
	);
}
