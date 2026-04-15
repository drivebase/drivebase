import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div className="p-6">
			<div className="flex items-center gap-2 mb-6">
				<Settings size={20} className="text-muted" />
				<h1 className="text-xl font-semibold text-foreground">Settings</h1>
			</div>
			<p className="text-muted text-sm">Workspace settings will appear here.</p>
		</div>
	);
}
