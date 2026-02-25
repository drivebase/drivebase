import { create } from "zustand";
import {
	AnalysisModelTier,
	type Job,
	type WorkspaceAiProgress,
	type WorkspaceAiSettings,
} from "@/gql/graphql";

interface AiSettingsState {
	workspaceId: string;
	canManageWorkspace: boolean;
	settings: WorkspaceAiSettings | null;
	progress: WorkspaceAiProgress | null;
	latestModelJob: Job | null;
	embeddingTier: AnalysisModelTier;
	ocrTier: AnalysisModelTier;
	maxConcurrency: string;
	setWorkspaceContext: (
		workspaceId: string,
		canManageWorkspace: boolean,
	) => void;
	setSettings: (settings: WorkspaceAiSettings | null) => void;
	setProgress: (progress: WorkspaceAiProgress | null) => void;
	setLatestModelJob: (job: Job | null) => void;
	setEmbeddingTier: (tier: AnalysisModelTier) => void;
	setOcrTier: (tier: AnalysisModelTier) => void;
	setMaxConcurrency: (value: string) => void;
}

export const useAiSettingsStore = create<AiSettingsState>((set) => ({
	workspaceId: "",
	canManageWorkspace: false,
	settings: null,
	progress: null,
	latestModelJob: null,
	embeddingTier: AnalysisModelTier.Medium,
	ocrTier: AnalysisModelTier.Medium,
	maxConcurrency: "2",
	setWorkspaceContext: (workspaceId, canManageWorkspace) =>
		set({ workspaceId, canManageWorkspace }),
	setSettings: (settings) =>
		set((state) => ({
			settings,
			embeddingTier: settings?.embeddingTier ?? state.embeddingTier,
			ocrTier: settings?.ocrTier ?? state.ocrTier,
			maxConcurrency: settings
				? String(settings.maxConcurrency)
				: state.maxConcurrency,
		})),
	setProgress: (progress) => set({ progress }),
	setLatestModelJob: (latestModelJob) => set({ latestModelJob }),
	setEmbeddingTier: (embeddingTier) => set({ embeddingTier }),
	setOcrTier: (ocrTier) => set({ ocrTier }),
	setMaxConcurrency: (maxConcurrency) => set({ maxConcurrency }),
}));
