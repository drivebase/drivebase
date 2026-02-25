import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiSettingsStore } from "@/features/ai/store/aiSettingsStore";

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown";
	return date.toLocaleString();
}

interface AiProgressSectionProps {
	onStart: () => void;
	onStop: () => void;
	onRetryFailed: () => void;
	startFetching: boolean;
	stopFetching: boolean;
	retryFetching: boolean;
}

export function AiProgressSection({
	onStart,
	onStop,
	onRetryFailed,
	startFetching,
	stopFetching,
	retryFetching,
}: AiProgressSectionProps) {
	const canManageWorkspace = useAiSettingsStore(
		(state) => state.canManageWorkspace,
	);
	const settings = useAiSettingsStore((state) => state.settings);
	const progress = useAiSettingsStore((state) => state.progress);
	const embeddingTier = useAiSettingsStore((state) => state.embeddingTier);
	const ocrTier = useAiSettingsStore((state) => state.ocrTier);

	const isProcessingActive =
		(progress?.pendingFiles ?? 0) > 0 || (progress?.runningFiles ?? 0) > 0;
	const isFullyProcessed = (progress?.completionPct ?? 0) >= 100;
	const requiresModelDownload = Boolean(
		(settings?.embeddingTier && settings.embeddingTier !== embeddingTier) ||
			(settings?.ocrTier && settings.ocrTier !== ocrTier),
	);

	return (
		<section className="space-y-4">
			<div className="space-y-1">
				<h3 className="text-lg font-medium">Progress</h3>
				<p className="text-sm text-muted-foreground">
					Live processing progress for eligible files.
				</p>
			</div>
			<div className="flex items-end justify-between gap-4">
				<div>
					<p className="text-4xl font-semibold">
						{progress?.completionPct?.toFixed(1) ?? "0.0"}%
					</p>
					<p className="text-sm text-muted-foreground">
						{progress?.processedFiles ?? 0} / {progress?.eligibleFiles ?? 0}{" "}
						eligible files processed
					</p>
				</div>
			</div>
			<div className="flex gap-2">
				<Button
					variant="outline"
					onClick={onStart}
					disabled={
						!canManageWorkspace ||
						startFetching ||
						!settings?.enabled ||
						requiresModelDownload ||
						isFullyProcessed ||
						isProcessingActive
					}
				>
					Start processing
				</Button>
				<Button
					variant="outline"
					onClick={onStop}
					disabled={!canManageWorkspace || stopFetching || !isProcessingActive}
				>
					Stop processing
				</Button>
				<Button
					variant="outline"
					onClick={onRetryFailed}
					disabled={
						!canManageWorkspace ||
						retryFetching ||
						(progress?.failedFiles ?? 0) === 0
					}
				>
					Retry failed files
				</Button>
			</div>

			<div className="flex flex-wrap gap-2">
				<Badge variant="secondary">
					Pending: {progress?.pendingFiles ?? 0}
				</Badge>
				<Badge variant="secondary">
					Running: {progress?.runningFiles ?? 0}
				</Badge>
				<Badge variant="secondary">
					Completed: {progress?.completedFiles ?? 0}
				</Badge>
				<Badge variant="secondary">Failed: {progress?.failedFiles ?? 0}</Badge>
				<Badge variant="secondary">
					Skipped: {progress?.skippedFiles ?? 0}
				</Badge>
			</div>

			<p className="text-xs text-muted-foreground">
				Last updated:{" "}
				{progress?.updatedAt ? formatDate(progress.updatedAt) : "Unknown"}
			</p>
		</section>
	);
}
