import { Trans } from "@lingui/react/macro";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GetFileRulesQuery } from "@/gql/graphql";
import { useCreateFileRule, useUpdateFileRule } from "../hooks/useRules";
import type { RuleConditionGroups } from "./ConditionGroupEditor";
import { RuleForm, type RuleFormValues } from "./RuleForm";

type FileRule = GetFileRulesQuery["fileRules"][number];

interface RuleFormPageProps {
	rule?: FileRule | null;
	onSuccess: () => void;
	onCancel: () => void;
}

export function RuleFormPage({ rule, onSuccess, onCancel }: RuleFormPageProps) {
	const isEditing = Boolean(rule);
	const [, createRule] = useCreateFileRule();
	const [, updateRule] = useUpdateFileRule();

	const handleSubmit = async (values: RuleFormValues) => {
		if (isEditing && rule) {
			const result = await updateRule({
				id: rule.id,
				input: values,
			});
			if (result.error) {
				toast.error(result.error.message);
				return;
			}
			toast.success("Rule updated");
		} else {
			const result = await createRule({ input: values });
			if (result.error) {
				toast.error(result.error.message);
				return;
			}
			toast.success("Rule created");
		}
		onSuccess();
	};

	const initialValues: Partial<RuleFormValues> | undefined = rule
		? {
				name: rule.name,
				enabled: rule.enabled,
				destinationProviderId: rule.destinationProviderId,
				destinationFolderId: rule.destinationFolderId ?? null,
				conditions: rule.conditions as RuleConditionGroups,
			}
		: undefined;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Button variant="outline" size="icon" onClick={onCancel}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h2 className="text-xl font-semibold">
						{isEditing ? <Trans>Edit Rule</Trans> : <Trans>Create Rule</Trans>}
					</h2>
					<p className="text-sm text-muted-foreground">
						<Trans>
							Automatically route uploaded files based on conditions.
						</Trans>
					</p>
				</div>
			</div>

			<RuleForm
				initialValues={initialValues}
				onSubmit={handleSubmit}
				onCancel={onCancel}
				submitLabel={
					isEditing ? <Trans>Save Changes</Trans> : <Trans>Create Rule</Trans>
				}
			/>
		</div>
	);
}
