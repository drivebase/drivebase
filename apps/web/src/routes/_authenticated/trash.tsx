import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trash")({
	component: () => (
		<div className="p-8 flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
			<Trash2 size={64} className="opacity-20" />
			<h2 className="text-2xl font-bold">Trash</h2>
			<p>Your deleted files will appear here.</p>
		</div>
	),
});
