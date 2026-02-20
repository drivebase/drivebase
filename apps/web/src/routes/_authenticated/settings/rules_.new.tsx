import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RuleFormPage } from "@/features/rules/components/RuleFormPage";

export const Route = createFileRoute("/_authenticated/settings/rules_/new")({
	component: NewRulePage,
});

function NewRulePage() {
	const navigate = useNavigate();

	const handleSuccess = () => {
		navigate({ to: "/settings/rules" });
	};

	const handleCancel = () => {
		navigate({ to: "/settings/rules" });
	};

	return <RuleFormPage onSuccess={handleSuccess} onCancel={handleCancel} />;
}
