import { createFileRoute } from "@tanstack/react-router";
import { UsersSettingsView } from "@/features/settings/UsersSettingsView";

export const Route = createFileRoute("/_authenticated/settings/users")({
	component: UsersSettingsPage,
});

function UsersSettingsPage() {
	return <UsersSettingsView />;
}
