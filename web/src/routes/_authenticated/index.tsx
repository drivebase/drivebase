import { createFileRoute } from "@tanstack/react-router";
import { Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="p-6">
			<div className="flex items-center gap-2 mb-6">
				<Home size={20} className="text-muted" />
				<h1 className="text-xl font-semibold text-foreground">Home</h1>
			</div>
			<p className="text-muted text-sm">Welcome to your workspace.</p>
		</div>
	);
}
