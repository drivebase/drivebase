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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useAiSettingsStore } from "@/features/ai/store/aiSettingsStore";

interface AiProcessingSectionProps {
	isUpdating: boolean;
	deleteFetching: boolean;
	onToggle: (enabled: boolean) => void;
	onFeatureEmbeddingChange: (enabled: boolean) => void;
	onFeatureOcrChange: (enabled: boolean) => void;
	onFeatureObjectDetectionChange: (enabled: boolean) => void;
	onDeleteAiData: () => void;
}

export function AiProcessingSection({
	isUpdating,
	deleteFetching,
	onToggle,
	onFeatureEmbeddingChange,
	onFeatureOcrChange,
	onFeatureObjectDetectionChange,
	onDeleteAiData,
}: AiProcessingSectionProps) {
	const canManageWorkspace = useAiSettingsStore(
		(state) => state.canManageWorkspace,
	);
	const settings = useAiSettingsStore((state) => state.settings);
	const progress = useAiSettingsStore((state) => state.progress);
	const featureEmbeddingEnabled = useAiSettingsStore(
		(state) => state.featureEmbeddingEnabled,
	);
	const featureOcrEnabled = useAiSettingsStore(
		(state) => state.featureOcrEnabled,
	);
	const featureObjectDetectionEnabled = useAiSettingsStore(
		(state) => state.featureObjectDetectionEnabled,
	);
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
				<div className="flex w-full items-center justify-between gap-4">
					<div className="space-y-1">
						<h3 className="text-lg font-medium">AI Processing</h3>
						<p className="text-sm text-muted-foreground">
							Turn AI processing on or off for this workspace.
						</p>
					</div>
					<Switch
						checked={isMainEnabled}
						disabled={!canManageWorkspace || isUpdating}
						onCheckedChange={onToggle}
					/>
				</div>
				<div className="w-full space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium">Embeddings</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className="text-muted-foreground hover:text-foreground"
											aria-label="Embeddings info"
										>
											<Info className="h-4 w-4" />
										</button>
									</TooltipTrigger>
									<TooltipContent sideOffset={6}>
										Semantic search by meaning and related concepts.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<Switch
							checked={featureEmbeddingEnabled}
							onCheckedChange={onFeatureEmbeddingChange}
							disabled={!canManageWorkspace || isUpdating || !isMainEnabled}
						/>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium">OCR / Text extraction</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className="text-muted-foreground hover:text-foreground"
											aria-label="OCR info"
										>
											<Info className="h-4 w-4" />
										</button>
									</TooltipTrigger>
									<TooltipContent sideOffset={6}>
										Extract searchable text from images and documents.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<Switch
							checked={featureOcrEnabled}
							onCheckedChange={onFeatureOcrChange}
							disabled={!canManageWorkspace || isUpdating || !isMainEnabled}
						/>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium">Object detection</span>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className="text-muted-foreground hover:text-foreground"
											aria-label="Object detection info"
										>
											<Info className="h-4 w-4" />
										</button>
									</TooltipTrigger>
									<TooltipContent sideOffset={6}>
										Find images by detected objects like cat, dog, car.
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<Switch
							checked={featureObjectDetectionEnabled}
							onCheckedChange={onFeatureObjectDetectionChange}
							disabled={!canManageWorkspace || isUpdating || !isMainEnabled}
						/>
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
									including embeddings, OCR text, detected objects, and analysis
									run history.
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
