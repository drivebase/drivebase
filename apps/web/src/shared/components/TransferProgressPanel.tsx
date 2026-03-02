import {
	PiCheckCircle as CheckCircle2,
	PiSpinnerGap as Loader2,
	PiX as X,
	PiXCircle as XCircle,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	type ProgressItem,
	useProgressItems,
} from "@/shared/lib/progressPanel";

/**
 * Bar colour:
 *   blue  (+ animated pulse) → indeterminate, provider → server
 *   green                    → determinate, server → browser / direct
 *   red                      → error
 */
function barClass(item: ProgressItem): string {
	if (item.phase === "error") return "bg-destructive";
	if (item.phase === "done" || item.phase === "green") return "bg-emerald-500";
	return "bg-blue-500"; // blue phase
}

function barValue(item: ProgressItem): number {
	// blue phase: fill bar fully — CSS pulse animation makes it feel indeterminate
	if (item.phase === "blue") return 100;
	if (item.phase === "done") return 100;
	return item.progress;
}

function StatusIcon({ item }: { item: ProgressItem }) {
	if (item.phase === "done")
		return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
	if (item.phase === "error")
		return <XCircle className="h-4 w-4 text-destructive" />;
	return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
}

/**
 * Global progress panel — mounted once in `__root.tsx`.
 * Driven entirely by `progressPanel.create/update/done/error` calls.
 * No props required.
 */
export function TransferProgressPanel() {
	const items = useProgressItems();
	if (items.length === 0) return null;

	const activeCount = items.filter(
		(i) => i.phase === "blue" || i.phase === "green",
	).length;
	const doneCount = items.filter((i) => i.phase === "done").length;
	const failedCount = items.filter((i) => i.phase === "error").length;

	return (
		<div className="fixed right-6 bottom-6 z-50 w-96 border bg-background shadow-2xl rounded-md overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<div className="text-sm font-semibold">Transfers</div>
				<div className="flex items-center gap-3">
					<span className="text-xs text-muted-foreground">
						{doneCount > 0 && `${doneCount} done`}
						{failedCount > 0 && `, ${failedCount} failed`}
					</span>
					{activeCount === 0 && items.length > 0 && (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								// remove all completed / errored items
								for (const item of items) {
									import("@/shared/lib/progressPanel").then(
										({ progressPanel }) => progressPanel.remove(item.id),
									);
								}
							}}
						>
							Close
						</Button>
					)}
				</div>
			</div>

			{/* Item list */}
			<div className="max-h-80 overflow-y-auto p-3 space-y-3">
				{items.map((item) => (
					<div key={item.id} className="space-y-1.5">
						{/* Row: title + icon */}
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<div className="text-sm font-medium truncate">{item.title}</div>
								{item.subtitle && (
									<div className="text-xs text-muted-foreground">
										{item.subtitle}
									</div>
								)}
							</div>
							<div className="shrink-0 flex items-center gap-1 pt-0.5">
								{item.canCancel && item.onCancel && (
									<Button
										size="icon"
										variant="ghost"
										className="h-6 w-6"
										onClick={item.onCancel}
										title="Cancel"
									>
										<X className="h-3.5 w-3.5" />
									</Button>
								)}
								<StatusIcon item={item} />
							</div>
						</div>

						{/* Progress bar */}
						<Progress
							value={barValue(item)}
							className="h-1.5"
							indicatorClassName={[
								barClass(item),
								item.phase === "blue" ? "animate-pulse" : "",
							]
								.filter(Boolean)
								.join(" ")}
						/>

						{/* Phase label */}
						{item.phaseLabel && (
							<div className="text-xs text-muted-foreground">
								{item.phaseLabel}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
