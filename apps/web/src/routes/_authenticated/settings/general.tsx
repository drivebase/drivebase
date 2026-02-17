import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettingsView } from "@/features/settings/GeneralSettingsView";

export const Route = createFileRoute("/_authenticated/settings/general")({
	component: GeneralSettingsPage,
});

function GeneralSettingsPage() {
	return <GeneralSettingsView />;
}
