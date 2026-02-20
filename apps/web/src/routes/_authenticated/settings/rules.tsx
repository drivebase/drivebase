import { createFileRoute } from "@tanstack/react-router";
import { RulesSettingsView } from "@/features/rules/RulesSettingsView";

export const Route = createFileRoute("/_authenticated/settings/rules")({
	component: RulesSettingsPage,
});

function RulesSettingsPage() {
	return <RulesSettingsView />;
}
