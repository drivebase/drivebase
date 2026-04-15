import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/files")({
	component: FilesPage,
});

function FilesPage() {
	return (
		<div className="p-6">
			<div className="flex items-center gap-2 mb-6">
				<FolderOpen size={20} className="text-muted" />
				<h1 className="text-xl font-semibold text-foreground">All files</h1>
			</div>
			<p className="text-muted text-sm">Your files will appear here.</p>
		</div>
	);
}
