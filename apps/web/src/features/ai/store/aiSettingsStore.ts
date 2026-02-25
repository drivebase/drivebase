import { create } from "zustand";
import {
	AnalysisModelTier,
	type Job,
	type WorkspaceAiProgress,
	type WorkspaceAiSettings,
} from "@/gql/graphql";

function readFeatureFlag(
	settings: WorkspaceAiSettings | null,
	key: "embedding" | "ocr" | "objectDetection",
): boolean {
	const config = settings?.config;
	if (!config || typeof config !== "object") return true;
	const aiFeatures = (config as Record<string, unknown>).aiFeatures;
	if (!aiFeatures || typeof aiFeatures !== "object") return true;
	const raw = (aiFeatures as Record<string, unknown>)[key];
	return typeof raw === "boolean" ? raw : true;
}

interface AiSettingsState {
	workspaceId: string;
	canManageWorkspace: boolean;
	settings: WorkspaceAiSettings | null;
	progress: WorkspaceAiProgress | null;
	latestModelJob: Job | null;
	embeddingTier: AnalysisModelTier;
	maxConcurrency: string;
	featureEmbeddingEnabled: boolean;
	featureOcrEnabled: boolean;
	featureObjectDetectionEnabled: boolean;
	setWorkspaceContext: (
		workspaceId: string,
		canManageWorkspace: boolean,
	) => void;
	setSettings: (settings: WorkspaceAiSettings | null) => void;
	setProgress: (progress: WorkspaceAiProgress | null) => void;
	setLatestModelJob: (job: Job | null) => void;
	setEmbeddingTier: (tier: AnalysisModelTier) => void;
	setMaxConcurrency: (value: string) => void;
	setFeatureEmbeddingEnabled: (enabled: boolean) => void;
	setFeatureOcrEnabled: (enabled: boolean) => void;
	setFeatureObjectDetectionEnabled: (enabled: boolean) => void;
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
	workspaceId: "",
	canManageWorkspace: false,
	settings: null,
	progress: null,
	latestModelJob: null,
	embeddingTier: AnalysisModelTier.Medium,
	maxConcurrency: "2",
	featureEmbeddingEnabled: true,
	featureOcrEnabled: true,
	featureObjectDetectionEnabled: true,
	setWorkspaceContext: (workspaceId, canManageWorkspace) =>
		set({ workspaceId, canManageWorkspace }),
	setSettings: (settings) =>
		set((state) => ({
			settings,
			embeddingTier: settings?.embeddingTier ?? state.embeddingTier,
			maxConcurrency: settings
				? String(settings.maxConcurrency)
				: state.maxConcurrency,
			featureEmbeddingEnabled: readFeatureFlag(settings, "embedding"),
			featureOcrEnabled: readFeatureFlag(settings, "ocr"),
			featureObjectDetectionEnabled: readFeatureFlag(
				settings,
				"objectDetection",
			),
		})),
	setProgress: (progress) => set({ progress }),
	setLatestModelJob: (latestModelJob) => set({ latestModelJob }),
	setEmbeddingTier: (embeddingTier) => set({ embeddingTier }),
	setMaxConcurrency: (maxConcurrency) => set({ maxConcurrency }),
	setFeatureEmbeddingEnabled: (featureEmbeddingEnabled) =>
		set({ featureEmbeddingEnabled }),
	setFeatureOcrEnabled: (featureOcrEnabled) => set({ featureOcrEnabled }),
	setFeatureObjectDetectionEnabled: (featureObjectDetectionEnabled) =>
		set({ featureObjectDetectionEnabled }),
}));
