import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettingsView } from "@/features/settings/WorkspaceSettingsView";

export const Route = createFileRoute("/_authenticated/settings/workspace")({
	component: WorkspaceSettingsPage,
});

function WorkspaceSettingsPage() {
	return <WorkspaceSettingsView />;
}
