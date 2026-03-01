import { createFileRoute } from "@tanstack/react-router";
import { ApiKeysSettingsView } from "@/features/settings/ApiKeysSettingsView";

export const Route = createFileRoute("/_authenticated/settings/api-keys")({
	component: ApiKeysSettingsPage,
});

function ApiKeysSettingsPage() {
	return <ApiKeysSettingsView />;
}
