import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/general")({
	component: GeneralSettingsPage,
});

function GeneralSettingsPage() {
	return (
		<div className="p-6 space-y-6">
			<div>
				<h1 className="text-lg font-semibold text-foreground">General</h1>
				<p className="text-sm text-muted mt-1">Manage your workspace preferences.</p>
			</div>
		</div>
	);
}
