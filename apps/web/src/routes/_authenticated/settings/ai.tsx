import { createFileRoute } from "@tanstack/react-router";
import { AiSettingsView } from "@/features/settings/AiSettingsView";

export const Route = createFileRoute("/_authenticated/settings/ai")({
	component: AiSettingsPage,
});

function AiSettingsPage() {
	return <AiSettingsView />;
}
