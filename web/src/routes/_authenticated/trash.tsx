import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trash")({
	component: TrashPage,
});

function TrashPage() {
	return (
		<div className="p-6">
			<div className="flex items-center gap-2 mb-6">
				<Trash2 size={20} className="text-muted" />
				<h1 className="text-xl font-semibold text-foreground">Deleted files</h1>
			</div>
			<p className="text-muted text-sm">Deleted files will appear here.</p>
		</div>
	);
}
