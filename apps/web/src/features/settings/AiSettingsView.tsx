import { useAiSettingsController } from "@/features/ai/hooks/useAiSettingsController";
import { AiModelsSection } from "./sections/AiModelsSection";
import { AiProcessingSection } from "./sections/AiProcessingSection";
import { AiProgressSection } from "./sections/AiProgressSection";

export function AiSettingsView() {
	const controller = useAiSettingsController();

	if (!controller.activeWorkspace) {
		return (
			<div className="space-y-2">
				<h3 className="text-lg font-medium">AI</h3>
				<p className="text-sm text-muted-foreground">No workspace selected.</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<AiProcessingSection
				isUpdating={controller.updateSettingsFetching}
				onToggle={controller.handleToggleAiProcessing}
			/>
			<AiProgressSection
				onRefresh={controller.refreshProgress}
				onStart={controller.handleStartProcessing}
				onStop={controller.handleStopProcessing}
				onRetryFailed={controller.handleRetryFailedFiles}
				startFetching={controller.startProcessingFetching}
				stopFetching={controller.stopProcessingFetching}
				retryFetching={controller.retryFailedFetching}
			/>
			<AiModelsSection
				updateFetching={controller.updateSettingsFetching}
				prepareFetching={controller.prepareModelsFetching}
				deleteFetching={controller.deleteAiDataFetching}
				onTierChange={controller.setEmbeddingTier}
				onMaxConcurrencyChange={controller.setMaxConcurrency}
				onDownloadModels={controller.handleDownloadModels}
				onSave={controller.handleSave}
				onDeleteAiData={controller.handleDeleteAiData}
			/>
		</div>
	);
}
