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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAiSettingsStore } from "@/features/ai/store/aiSettingsStore";

interface AiProcessingSectionProps {
	isUpdating: boolean;
	deleteFetching: boolean;
	saveFetching: boolean;
	onToggle: (enabled: boolean) => void;
	onMaxConcurrencyChange: (value: string) => void;
	onSaveProcessingSettings: () => void;
	onDeleteAiData: () => void;
}

export function AiProcessingSection({
	isUpdating,
	deleteFetching,
	saveFetching,
	onToggle,
	onMaxConcurrencyChange,
	onSaveProcessingSettings,
	onDeleteAiData,
}: AiProcessingSectionProps) {
	const canManageWorkspace = useAiSettingsStore(
		(state) => state.canManageWorkspace,
	);
	const settings = useAiSettingsStore((state) => state.settings);
	const progress = useAiSettingsStore((state) => state.progress);
	const maxConcurrency = useAiSettingsStore((state) => state.maxConcurrency);
	const isMainEnabled = Boolean(settings?.enabled);
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
			<section className="space-y-4">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<h3 className="text-lg font-medium">AI Processing</h3>
						<p className="text-sm text-muted-foreground">
							Turn AI processing on or off for this workspace.
						</p>
					</div>
					<div>
						<Switch
							checked={isMainEnabled}
							disabled={!canManageWorkspace || isUpdating}
							onCheckedChange={onToggle}
						/>
					</div>
				</div>
				<div className="w-full max-w-xs space-y-2">
					<span className="text-sm font-medium">Max concurrency</span>
					<div className="flex items-center gap-2">
						<Input
							value={maxConcurrency}
							onChange={(event) => onMaxConcurrencyChange(event.target.value)}
							disabled={!canManageWorkspace}
							inputMode="numeric"
							className="h-10 text-sm"
						/>
						<Button
							onClick={onSaveProcessingSettings}
							disabled={!canManageWorkspace || saveFetching}
						>
							Save
						</Button>
					</div>
				</div>
				<div className="flex">
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
									This will remove all AI analysis results for this workspace,
									including embeddings, OCR text, and analysis run history.
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
			</section>
			<Separator />
		</>
	);
}
