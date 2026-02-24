import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AnalysisModelTier } from "@/gql/graphql";
import { useAiSettingsStore } from "@/features/ai/store/aiSettingsStore";

const TIER_OPTIONS: AnalysisModelTier[] = [
	AnalysisModelTier.Lightweight,
	AnalysisModelTier.Medium,
	AnalysisModelTier.Heavy,
];

interface AiModelsSectionProps {
	updateFetching: boolean;
	prepareFetching: boolean;
	deleteFetching: boolean;
	onTierChange: (tier: AnalysisModelTier) => void;
	onMaxConcurrencyChange: (value: string) => void;
	onDownloadModels: () => void;
	onSave: () => void;
	onDeleteAiData: () => void;
}

export function AiModelsSection({
	updateFetching,
	prepareFetching,
	deleteFetching,
	onTierChange,
	onMaxConcurrencyChange,
	onDownloadModels,
	onSave,
	onDeleteAiData,
}: AiModelsSectionProps) {
	const canManageWorkspace = useAiSettingsStore(
		(state) => state.canManageWorkspace,
	);
	const settings = useAiSettingsStore((state) => state.settings);
	const progress = useAiSettingsStore((state) => state.progress);
	const latestModelJob = useAiSettingsStore((state) => state.latestModelJob);
	const embeddingTier = useAiSettingsStore((state) => state.embeddingTier);
	const maxConcurrency = useAiSettingsStore((state) => state.maxConcurrency);

	const hasModelsReady = settings?.modelsReady ?? false;
	const requiresModelDownload = Boolean(
		(settings?.embeddingTier && settings.embeddingTier !== embeddingTier) ||
			(settings?.ocrTier && settings.ocrTier !== embeddingTier) ||
			(settings?.objectTier && settings.objectTier !== embeddingTier),
	);
	const isProcessingActive =
		(progress?.pendingFiles ?? 0) > 0 || (progress?.runningFiles ?? 0) > 0;
	const hasAiData =
		(progress?.pendingFiles ?? 0) +
			(progress?.runningFiles ?? 0) +
			(progress?.completedFiles ?? 0) +
			(progress?.failedFiles ?? 0) +
			(progress?.skippedFiles ?? 0) >
		0;

	return (
		<>
			<Separator />
			<section className="space-y-5">
				<div className="space-y-1">
					<h3 className="text-lg font-medium">AI Models</h3>
					<p className="text-sm text-muted-foreground">
						Configure model tiers and processing controls for this workspace.
					</p>
				</div>

				{latestModelJob ? (
					<div className="space-y-1 rounded-md border border-border/60 p-3">
						<p className="text-sm">{latestModelJob.title}</p>
						<p className="text-xs text-muted-foreground">
							{latestModelJob.message ?? "Preparing models..."} (
							{Math.round(latestModelJob.progress * 100)}%)
						</p>
						<p className="text-xs text-muted-foreground">
							Status: {latestModelJob.status}
						</p>
					</div>
				) : null}

				{!hasModelsReady ? (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							No models are downloaded yet. Download models first to unlock AI
							settings and processing controls.
						</p>
						<Button
							onClick={onDownloadModels}
							disabled={!canManageWorkspace || prepareFetching}
						>
							Download models
						</Button>
					</div>
				) : (
					<>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Model size</Label>
								<Select
									value={embeddingTier}
									onValueChange={(value) =>
										onTierChange(value as AnalysisModelTier)
									}
									disabled={!canManageWorkspace}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TIER_OPTIONS.map((tier) => (
											<SelectItem key={tier} value={tier}>
												{tier}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2 max-w-md">
							<Label>Max concurrency</Label>
							<input
								className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
								value={maxConcurrency}
								onChange={(event) => onMaxConcurrencyChange(event.target.value)}
								disabled={!canManageWorkspace}
								inputMode="numeric"
							/>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={onSave}
								disabled={
									!canManageWorkspace || updateFetching || requiresModelDownload
								}
							>
								Save AI settings
							</Button>
							{requiresModelDownload ? (
								<Button
									variant="outline"
									onClick={onDownloadModels}
									disabled={!canManageWorkspace || prepareFetching}
								>
									Download selected model
								</Button>
							) : null}
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="destructive"
										disabled={
											!canManageWorkspace ||
											deleteFetching ||
											isProcessingActive ||
											!hasAiData
										}
									>
										Delete AI data
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete AI data?</AlertDialogTitle>
										<AlertDialogDescription>
											This will remove all AI analysis results for this
											workspace, including embeddings, OCR text, detected
											objects, and analysis run history.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											variant="destructive"
											onClick={onDeleteAiData}
										>
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</>
				)}
			</section>
		</>
	);
}
