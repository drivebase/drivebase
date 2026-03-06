import { createFileRoute } from "@tanstack/react-router";
import { WebDavSettingsView } from "@/features/settings/WebDavSettingsView";

export const Route = createFileRoute("/_authenticated/settings/webdav")({
	component: WebDavSettingsPage,
});

function WebDavSettingsPage() {
	return <WebDavSettingsView />;
}
