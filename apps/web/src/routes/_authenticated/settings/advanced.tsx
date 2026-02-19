import { createFileRoute } from "@tanstack/react-router";
import { AdvancedSettingsView } from "@/features/settings/AdvancedSettingsView";

export const Route = createFileRoute("/_authenticated/settings/advanced")({
	component: AdvancedSettingsPage,
});

function AdvancedSettingsPage() {
	return <AdvancedSettingsView />;
}
