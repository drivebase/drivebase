import { createFileRoute } from "@tanstack/react-router";
import { UserRoundPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/shared")({
	component: SharedPage,
});

function SharedPage() {
	return (
		<div className="p-6">
			<div className="flex items-center gap-2 mb-6">
				<UserRoundPlus size={20} className="text-muted" />
				<h1 className="text-xl font-semibold text-foreground">Shared with me</h1>
			</div>
			<p className="text-muted text-sm">Files shared with you will appear here.</p>
		</div>
	);
}
