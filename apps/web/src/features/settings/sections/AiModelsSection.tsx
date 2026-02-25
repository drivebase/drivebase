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
import { AnalysisModelTier } from "@/gql/graphql";

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

const OBJECT_MODEL_BY_TIER: Record<AnalysisModelTier, string> = {
	[AnalysisModelTier.Lightweight]: "YOLOv8n",
	[AnalysisModelTier.Medium]: "YOLOv8s",
	[AnalysisModelTier.Heavy]: "YOLOv9",
};

interface AiModelsSectionProps {
	prepareFetching: boolean;
	onEmbeddingTierChange: (tier: AnalysisModelTier) => void;
	onOcrTierChange: (tier: AnalysisModelTier) => void;
	onObjectTierChange: (tier: AnalysisModelTier) => void;
	onDownloadEmbeddingModel: () => void;
	onDownloadOcrModel: () => void;
	onDownloadObjectModel: () => void;
}

interface ModelRowProps {
	title: string;
	modelName: string;
	tier: AnalysisModelTier;
	isReady: boolean;
	canManageWorkspace: boolean;
	prepareFetching: boolean;
	onTierChange: (tier: AnalysisModelTier) => void;
	onDownload: () => void;
}

function ModelRow({
	title,
	modelName,
	tier,
	isReady,
	canManageWorkspace,
	prepareFetching,
	onTierChange,
	onDownload,
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
			<div className="flex flex-col gap-2 w-52">
				<div className="space-y-2">
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
				<Button
					variant="outline"
					onClick={onDownload}
					disabled={!canManageWorkspace || prepareFetching || isReady}
					className="w-full"
				>
					Download
				</Button>
			</div>
		</div>
	);
}

export function AiModelsSection({
	prepareFetching,
	onEmbeddingTierChange,
	onOcrTierChange,
	onObjectTierChange,
	onDownloadEmbeddingModel,
	onDownloadOcrModel,
	onDownloadObjectModel,
}: AiModelsSectionProps) {
	const canManageWorkspace = useAiSettingsStore(
		(state) => state.canManageWorkspace,
	);
	const settings = useAiSettingsStore((state) => state.settings);
	const embeddingTier = useAiSettingsStore((state) => state.embeddingTier);
	const ocrTier = useAiSettingsStore((state) => state.ocrTier);
	const objectTier = useAiSettingsStore((state) => state.objectTier);

	const embeddingReady =
		Boolean(settings?.modelsReady) && settings?.embeddingTier === embeddingTier;
	const ocrReady =
		Boolean(settings?.modelsReady) && settings?.ocrTier === ocrTier;
	const objectReady =
		Boolean(settings?.modelsReady) && settings?.objectTier === objectTier;

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
						prepareFetching={prepareFetching}
						onTierChange={onEmbeddingTierChange}
						onDownload={onDownloadEmbeddingModel}
					/>
					<ModelRow
						title="OCR"
						modelName={OCR_MODEL_BY_TIER[ocrTier]}
						tier={ocrTier}
						isReady={ocrReady}
						canManageWorkspace={canManageWorkspace}
						prepareFetching={prepareFetching}
						onTierChange={onOcrTierChange}
						onDownload={onDownloadOcrModel}
					/>
					<ModelRow
						title="Object Detection"
						modelName={OBJECT_MODEL_BY_TIER[objectTier]}
						tier={objectTier}
						isReady={objectReady}
						canManageWorkspace={canManageWorkspace}
						prepareFetching={prepareFetching}
						onTierChange={onObjectTierChange}
						onDownload={onDownloadObjectModel}
					/>
				</div>
			</section>
		</>
	);
}
