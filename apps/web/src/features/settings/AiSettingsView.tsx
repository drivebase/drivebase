import { Trans } from "@lingui/react/macro";
import { useAiSettingsController } from "@/features/ai/hooks/useAiSettingsController";
import { AiModelsSection } from "./sections/AiModelsSection";
import { AiProcessingSection } from "./sections/AiProcessingSection";
import { AiProgressSection } from "./sections/AiProgressSection";

export function AiSettingsView() {
	const controller = useAiSettingsController();

	if (!controller.activeWorkspace) {
		return (
			<div className="space-y-2">
				<h3 className="text-lg font-medium">
					<Trans>AI</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>No workspace selected.</Trans>
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<AiProcessingSection
				isUpdating={controller.updateSettingsFetching}
				deleteFetching={controller.deleteAiDataFetching}
				saveFetching={controller.updateSettingsFetching}
				onToggle={controller.handleToggleAiProcessing}
				onMaxConcurrencyChange={controller.setMaxConcurrency}
				onSaveProcessingSettings={controller.handleSave}
				onDeleteAiData={controller.handleDeleteAiData}
			/>
			<AiProgressSection
				onStart={controller.handleStartProcessing}
				onStop={controller.handleStopProcessing}
				onRetryFailed={controller.handleRetryFailedFiles}
				startFetching={controller.startProcessingFetching}
				stopFetching={controller.stopProcessingFetching}
				retryFetching={controller.retryFailedFetching}
			/>
			<AiModelsSection
				prepareFetching={controller.prepareModelsFetching}
				onEmbeddingTierChange={controller.setEmbeddingTier}
				onOcrTierChange={controller.setOcrTier}
				onDownloadModels={controller.handleDownloadModels}
			/>
		</div>
	);
}
