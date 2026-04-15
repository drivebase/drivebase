import { createFileRoute } from "@tanstack/react-router";
import { FolderLock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/private")({
	component: PrivatePage,
});

function PrivatePage() {
	return (
		<div className="p-6">
			<div className="flex items-center gap-2 mb-6">
				<FolderLock size={20} className="text-muted" />
				<h1 className="text-xl font-semibold text-foreground">Private files</h1>
			</div>
			<p className="text-muted text-sm">Your private files will appear here.</p>
		</div>
	);
}
