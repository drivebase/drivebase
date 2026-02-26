import { Badge } from "@/components/ui/badge";
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
import { useAiSettingsStore } from "@/features/ai/store/aiSettingsStore";
import { AnalysisModelTier, JobStatus } from "@/gql/graphql";

const TIER_OPTIONS: AnalysisModelTier[] = [
	AnalysisModelTier.Lightweight,
	AnalysisModelTier.Medium,
	AnalysisModelTier.Heavy,
];

const EMBEDDING_MODEL_BY_TIER: Record<AnalysisModelTier, string> = {
	[AnalysisModelTier.Lightweight]: "MobileCLIP",
	[AnalysisModelTier.Medium]: "CLIP ViT-B/32",
	[AnalysisModelTier.Heavy]: "CLIP ViT-L/14",
};

const OCR_MODEL_BY_TIER: Record<AnalysisModelTier, string> = {
	[AnalysisModelTier.Lightweight]: "Tesseract",
	[AnalysisModelTier.Medium]: "PaddleOCR",
	[AnalysisModelTier.Heavy]: "PaddleOCR High-Accuracy",
};

interface AiModelsSectionProps {
	prepareFetching: boolean;
	onEmbeddingTierChange: (tier: AnalysisModelTier) => void;
	onOcrTierChange: (tier: AnalysisModelTier) => void;
	onDownloadModels: () => void;
}

interface ModelRowProps {
	title: string;
	modelName: string;
	tier: AnalysisModelTier;
	isReady: boolean;
	canManageWorkspace: boolean;
	onTierChange: (tier: AnalysisModelTier) => void;
}

function ModelRow({
	title,
	modelName,
	tier,
	isReady,
	canManageWorkspace,
	onTierChange,
}: ModelRowProps) {
	return (
		<div className="border border-border/60 p-3 space-y-3">
			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<p className="text-sm font-medium">{title}</p>
					<Badge variant={isReady ? "secondary" : "outline"}>
						{isReady ? "Downloaded" : "Not downloaded"}
					</Badge>
				</div>
				<p className="text-xs text-muted-foreground">Model: {modelName}</p>
			</div>
			<div className="space-y-2 w-52">
				<Label>Size</Label>
				<Select
					value={tier}
					onValueChange={(value) => onTierChange(value as AnalysisModelTier)}
					disabled={!canManageWorkspace || isReady}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TIER_OPTIONS.map((itemTier) => (
							<SelectItem key={itemTier} value={itemTier}>
								{itemTier}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

export function AiModelsSection({
	prepareFetching,
	onEmbeddingTierChange,
	onOcrTierChange,
	onDownloadModels,
}: AiModelsSectionProps) {
	const canManageWorkspace = useAiSettingsStore(
		(state) => state.canManageWorkspace,
	);
	const settings = useAiSettingsStore((state) => state.settings);
	const embeddingTier = useAiSettingsStore((state) => state.embeddingTier);
	const ocrTier = useAiSettingsStore((state) => state.ocrTier);
	const latestModelJob = useAiSettingsStore((state) => state.latestModelJob);

	const readyMap =
		settings?.config &&
		typeof settings.config === "object" &&
		(settings.config as Record<string, unknown>).aiModelReady &&
		typeof (settings.config as Record<string, unknown>).aiModelReady ===
			"object"
			? ((settings.config as Record<string, unknown>).aiModelReady as Record<
					string,
					unknown
				>)
			: {};

	const embeddingReady =
		settings?.embeddingTier === embeddingTier &&
		(readyMap.embedding === true || settings?.modelsReady === true);
	const ocrReady =
		settings?.ocrTier === ocrTier &&
		(readyMap.ocr === true || settings?.modelsReady === true);
	const modelDownloadInFlight =
		latestModelJob?.status === JobStatus.Pending ||
		latestModelJob?.status === JobStatus.Running;
	const downloadProgressPct = Math.max(
		0,
		Math.min(100, Math.round((latestModelJob?.progress ?? 0) * 100)),
	);
	const allReady = embeddingReady && ocrReady;
	const downloadLabel = modelDownloadInFlight
		? `Downloading... ${downloadProgressPct}%`
		: allReady
			? "Downloaded"
			: "Start download";

	return (
		<>
			<Separator />
			<section className="space-y-5">
				<div className="space-y-1">
					<h3 className="text-lg font-medium">AI Models</h3>
					<p className="text-sm text-muted-foreground">
						Select model sizes per category and download before processing.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<ModelRow
						title="Embedding"
						modelName={EMBEDDING_MODEL_BY_TIER[embeddingTier]}
						tier={embeddingTier}
						isReady={embeddingReady}
						canManageWorkspace={canManageWorkspace}
						onTierChange={onEmbeddingTierChange}
					/>
					<ModelRow
						title="OCR"
						modelName={OCR_MODEL_BY_TIER[ocrTier]}
						tier={ocrTier}
						isReady={ocrReady}
						canManageWorkspace={canManageWorkspace}
						onTierChange={onOcrTierChange}
					/>
				</div>
				<div>
					<Button
						variant="outline"
						onClick={onDownloadModels}
						disabled={
							!canManageWorkspace ||
							prepareFetching ||
							modelDownloadInFlight ||
							allReady
						}
					>
						{downloadLabel}
					</Button>
				</div>
			</section>
		</>
	);
}
