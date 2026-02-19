import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsView } from "@/features/settings/AccountSettingsView";

export const Route = createFileRoute("/_authenticated/settings/account")({
	component: AccountSettingsPage,
});

function AccountSettingsPage() {
	return <AccountSettingsView />;
}
