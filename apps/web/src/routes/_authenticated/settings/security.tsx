import { createFileRoute } from "@tanstack/react-router";
import { SecuritySettingsView } from "@/features/settings/SecuritySettingsView";

export const Route = createFileRoute("/_authenticated/settings/security")({
	component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
	return <SecuritySettingsView />;
}
