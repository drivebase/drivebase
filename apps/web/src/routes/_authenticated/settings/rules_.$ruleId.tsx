import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RuleFormPage } from "@/features/rules/components/RuleFormPage";
import { useFileRule } from "@/features/rules/hooks/useRules";

export const Route = createFileRoute("/_authenticated/settings/rules_/$ruleId")(
	{
		component: EditRulePage,
	},
);

function EditRulePage() {
	const { ruleId } = Route.useParams();
	const navigate = useNavigate();
	const [result] = useFileRule(ruleId);

	const handleBack = () => {
		navigate({ to: "/settings/rules" });
	};

	if (result.fetching) {
		return (
			<div className="text-sm text-muted-foreground">Loading rule...</div>
		);
	}

	if (result.error || !result.data?.fileRule) {
		return (
			<div className="text-sm text-destructive">
				{result.error?.message ?? "Rule not found"}
			</div>
		);
	}

	return (
		<RuleFormPage
			rule={result.data.fileRule}
			onSuccess={handleBack}
			onCancel={handleBack}
		/>
	);
}
