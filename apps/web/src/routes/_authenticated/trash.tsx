import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "@/shared/components/icons/solar";

export const Route = createFileRoute("/_authenticated/trash")({
	component: () => (
		<div className="p-8 flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
			<Trash2 size={64} className="opacity-20" />
			<h2 className="text-2xl font-bold">
				<Trans>Trash</Trans>
			</h2>
			<p>
				<Trans>Your deleted files will appear here.</Trans>
			</p>
		</div>
	),
});
