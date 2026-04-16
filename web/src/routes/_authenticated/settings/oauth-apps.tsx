import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/oauth-apps")({
	component: OAuthAppsSettingsPage,
});

function OAuthAppsSettingsPage() {
	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-lg font-semibold text-foreground">OAuth Apps</h1>
				<p className="text-sm text-muted mt-1">Manage OAuth applications used for provider connections.</p>
			</div>
		</div>
	);
}
