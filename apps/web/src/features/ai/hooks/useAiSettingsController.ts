import { useEffect, useMemo } from "react";
import { useQuery, useSubscription } from "urql";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
	getActiveWorkspaceId,
	useDeleteWorkspaceAiData,
	usePrepareWorkspaceAiModels,
	useRetryWorkspaceAiFailedFiles,
	useStartWorkspaceAiProcessing,
	useStopWorkspaceAiProcessing,
	useUpdateWorkspaceAiSettings,
	useWorkspaceAiProgress,
	useWorkspaceAiSettings,
	useWorkspaceMembers,
	useWorkspaces,
	WORKSPACE_AI_PROGRESS_UPDATED_SUBSCRIPTION,
} from "@/features/workspaces";
import { WorkspaceMemberRole } from "@/gql/graphql";
import { AiModelTask } from "@/gql/graphql";
import {
	ACTIVE_JOBS_QUERY,
	JOB_UPDATED_SUBSCRIPTION,
} from "@/shared/api/activity";
import { useAiSettingsStore } from "../store/aiSettingsStore";

export function useAiSettingsController() {
	const [workspacesResult] = useWorkspaces(false);
	const activeWorkspaceId = getActiveWorkspaceId();
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
	const setWorkspaceContext = useAiSettingsStore(
		(state) => state.setWorkspaceContext,
	);
	const setSettings = useAiSettingsStore((state) => state.setSettings);
	const setProgress = useAiSettingsStore((state) => state.setProgress);
	const setLatestModelJob = useAiSettingsStore(
		(state) => state.setLatestModelJob,
	);
	const setEmbeddingTier = useAiSettingsStore(
		(state) => state.setEmbeddingTier,
	);
	const setOcrTier = useAiSettingsStore((state) => state.setOcrTier);
	const setObjectTier = useAiSettingsStore((state) => state.setObjectTier);
	const setMaxConcurrency = useAiSettingsStore(
		(state) => state.setMaxConcurrency,
	);
	const setFeatureEmbeddingEnabled = useAiSettingsStore(
		(state) => state.setFeatureEmbeddingEnabled,
	);
	const setFeatureOcrEnabled = useAiSettingsStore(
		(state) => state.setFeatureOcrEnabled,
	);
	const setFeatureObjectDetectionEnabled = useAiSettingsStore(
		(state) => state.setFeatureObjectDetectionEnabled,
	);
	const embeddingTier = useAiSettingsStore((state) => state.embeddingTier);
	const ocrTier = useAiSettingsStore((state) => state.ocrTier);
	const objectTier = useAiSettingsStore((state) => state.objectTier);
	const maxConcurrency = useAiSettingsStore((state) => state.maxConcurrency);
	const featureEmbeddingEnabled = useAiSettingsStore(
		(state) => state.featureEmbeddingEnabled,
	);
	const featureOcrEnabled = useAiSettingsStore(
		(state) => state.featureOcrEnabled,
	);
	const featureObjectDetectionEnabled = useAiSettingsStore(
		(state) => state.featureObjectDetectionEnabled,
	);

	const activeWorkspace = useMemo(() => {
		const workspaces = workspacesResult.data?.workspaces ?? [];
		return (
			workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
			workspaces[0] ??
			null
		);
	}, [workspacesResult.data?.workspaces, activeWorkspaceId]);

	const workspaceId = activeWorkspace?.id ?? "";
	const [membersResult] = useWorkspaceMembers(workspaceId, !workspaceId);
	const currentRole = (membersResult.data?.workspaceMembers ?? []).find(
		(member) => member.userId === currentUserId,
	)?.role;
	const canManageWorkspace =
		currentRole === WorkspaceMemberRole.Owner ||
		currentRole === WorkspaceMemberRole.Admin;

	const [settingsResult, reexecuteSettings] = useWorkspaceAiSettings(
		workspaceId,
		!workspaceId,
	);
	const [progressResult, reexecuteProgress] = useWorkspaceAiProgress(
		workspaceId,
		!workspaceId,
	);
	const [updateSettingsResult, updateSettings] = useUpdateWorkspaceAiSettings();
	const [prepareModelsResult, prepareModels] = usePrepareWorkspaceAiModels();
	const [startProcessingResult, startProcessing] =
		useStartWorkspaceAiProcessing();
	const [stopProcessingResult, stopProcessing] = useStopWorkspaceAiProcessing();
	const [retryFailedResult, retryFailed] = useRetryWorkspaceAiFailedFiles();
	const [deleteAiDataResult, deleteAiData] = useDeleteWorkspaceAiData();

	const [{ data: activeJobsData }] = useQuery({
		query: ACTIVE_JOBS_QUERY,
		pause: !workspaceId,
	});
	const [{ data: jobUpdatedData }] = useSubscription({
		query: JOB_UPDATED_SUBSCRIPTION,
		pause: !workspaceId,
	});
	const [{ data: aiProgressSubData }] = useSubscription({
		query: WORKSPACE_AI_PROGRESS_UPDATED_SUBSCRIPTION,
		variables: { workspaceId },
		pause: !workspaceId,
	});

	useEffect(() => {
		setWorkspaceContext(workspaceId, canManageWorkspace);
	}, [workspaceId, canManageWorkspace, setWorkspaceContext]);

	useEffect(() => {
		setSettings(settingsResult.data?.workspaceAiSettings ?? null);
	}, [settingsResult.data?.workspaceAiSettings, setSettings]);

	useEffect(() => {
		const progress =
			aiProgressSubData?.workspaceAiProgressUpdated ??
			progressResult.data?.workspaceAiProgress ??
			null;
		setProgress(progress);
	}, [
		aiProgressSubData?.workspaceAiProgressUpdated,
		progressResult.data?.workspaceAiProgress,
		setProgress,
	]);

	const activeModelJobs = useMemo(() => {
		const jobs = activeJobsData?.activeJobs ?? [];
		return jobs.filter((job) => {
			if (job.type !== "ai_model_download") return false;
			const jobWorkspaceId =
				typeof job.metadata?.workspaceId === "string"
					? job.metadata.workspaceId
					: null;
			return jobWorkspaceId === workspaceId;
		});
	}, [activeJobsData?.activeJobs, workspaceId]);

	const latestModelJob = useMemo(() => {
		const subscriptionJob = jobUpdatedData?.jobUpdated;
		if (
			subscriptionJob?.type === "ai_model_download" &&
			typeof subscriptionJob.metadata?.workspaceId === "string" &&
			subscriptionJob.metadata.workspaceId === workspaceId
		) {
			return subscriptionJob;
		}

		return (
			activeModelJobs
				.slice()
				.sort(
					(a, b) =>
						new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
				)[0] ?? null
		);
	}, [activeModelJobs, jobUpdatedData?.jobUpdated, workspaceId]);

	useEffect(() => {
		setLatestModelJob(latestModelJob);
	}, [latestModelJob, setLatestModelJob]);

	useEffect(() => {
		if (!latestModelJob) return;
		if (latestModelJob.type !== "ai_model_download") return;
		if (latestModelJob.status !== "COMPLETED") return;

		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	}, [latestModelJob, reexecuteProgress, reexecuteSettings]);

	const handleDownloadModels = async () => {
		await persistTiersAndPrepare();
	};

	const persistTiersAndPrepare = async (tasks?: AiModelTask[]) => {
		if (!workspaceId || !canManageWorkspace) return;
		const persisted = await updateSettings({
			input: {
				workspaceId,
				embeddingTier,
				ocrTier,
				objectTier,
			},
		});
		if (persisted.error || !persisted.data?.updateWorkspaceAiSettings) return;
		const result = await prepareModels({ workspaceId, tasks });
		if (result.error || !result.data?.prepareWorkspaceAiModels) return;
		reexecuteSettings({ requestPolicy: "network-only" });
	};

	const handleSave = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const parsedConcurrency = Number.parseInt(maxConcurrency, 10);
		if (Number.isNaN(parsedConcurrency) || parsedConcurrency < 1) {
			setMaxConcurrency("1");
			return;
		}

		const currentConfig =
			settingsResult.data?.workspaceAiSettings?.config &&
			typeof settingsResult.data.workspaceAiSettings.config === "object"
				? (settingsResult.data.workspaceAiSettings.config as Record<
						string,
						unknown
					>)
				: {};

		const result = await updateSettings({
			input: {
				workspaceId,
				maxConcurrency: parsedConcurrency,
				config: {
					...currentConfig,
					aiFeatures: {
						embedding: featureEmbeddingEnabled,
						ocr: featureOcrEnabled,
						objectDetection: featureObjectDetectionEnabled,
					},
				},
			},
		});

		if (result.error || !result.data?.updateWorkspaceAiSettings) return;
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleStartProcessing = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await startProcessing({ workspaceId });
		if (result.error || !result.data?.startWorkspaceAiProcessing) return;
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleStopProcessing = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await stopProcessing({ workspaceId });
		if (result.error || !result.data?.stopWorkspaceAiProcessing) return;
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleToggleAiProcessing = async (enabled: boolean) => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await updateSettings({ input: { workspaceId, enabled } });
		if (result.error || !result.data?.updateWorkspaceAiSettings) return;
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleDeleteAiData = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await deleteAiData({ workspaceId });
		if (result.error || !result.data?.deleteWorkspaceAiData) return;
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const persistFeatureConfig = async (
		next: Partial<{
			embedding: boolean;
			ocr: boolean;
			objectDetection: boolean;
		}>,
	) => {
		if (!workspaceId || !canManageWorkspace) return;
		const currentConfig =
			settingsResult.data?.workspaceAiSettings?.config &&
			typeof settingsResult.data.workspaceAiSettings.config === "object"
				? (settingsResult.data.workspaceAiSettings.config as Record<
						string,
						unknown
					>)
				: {};
		const existingFeatures =
			currentConfig.aiFeatures && typeof currentConfig.aiFeatures === "object"
				? (currentConfig.aiFeatures as Record<string, unknown>)
				: {};
		const result = await updateSettings({
			input: {
				workspaceId,
				config: {
					...currentConfig,
					aiFeatures: {
						...existingFeatures,
						embedding:
							typeof next.embedding === "boolean"
								? next.embedding
								: featureEmbeddingEnabled,
						ocr: typeof next.ocr === "boolean" ? next.ocr : featureOcrEnabled,
						objectDetection:
							typeof next.objectDetection === "boolean"
								? next.objectDetection
								: featureObjectDetectionEnabled,
					},
				},
			},
		});
		if (result.error || !result.data?.updateWorkspaceAiSettings) {
			reexecuteSettings({ requestPolicy: "network-only" });
			return;
		}
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleFeatureEmbeddingToggle = (enabled: boolean) => {
		setFeatureEmbeddingEnabled(enabled);
		void persistFeatureConfig({ embedding: enabled });
	};

	const handleFeatureOcrToggle = (enabled: boolean) => {
		setFeatureOcrEnabled(enabled);
		void persistFeatureConfig({ ocr: enabled });
	};

	const handleFeatureObjectDetectionToggle = (enabled: boolean) => {
		setFeatureObjectDetectionEnabled(enabled);
		void persistFeatureConfig({ objectDetection: enabled });
	};

	const handleRetryFailedFiles = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await retryFailed({ workspaceId });
		if (result.error || !result.data?.retryWorkspaceAiFailedFiles) return;
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleDownloadEmbeddingModel = async () => {
		await persistTiersAndPrepare([AiModelTask.Embedding]);
	};

	const handleDownloadOcrModel = async () => {
		await persistTiersAndPrepare([AiModelTask.Ocr]);
	};

	const handleDownloadObjectModel = async () => {
		await persistTiersAndPrepare([AiModelTask.ObjectDetection]);
	};

	return {
		activeWorkspace,
		setEmbeddingTier,
		setOcrTier,
		setObjectTier,
		setMaxConcurrency,
		handleDownloadModels,
		handleDownloadEmbeddingModel,
		handleDownloadOcrModel,
		handleDownloadObjectModel,
		handleSave,
		handleStartProcessing,
		handleStopProcessing,
		handleToggleAiProcessing,
		handleFeatureEmbeddingToggle,
		handleFeatureOcrToggle,
		handleFeatureObjectDetectionToggle,
		handleDeleteAiData,
		handleRetryFailedFiles,
		updateSettingsFetching: updateSettingsResult.fetching,
		prepareModelsFetching: prepareModelsResult.fetching,
		startProcessingFetching: startProcessingResult.fetching,
		stopProcessingFetching: stopProcessingResult.fetching,
		retryFailedFetching: retryFailedResult.fetching,
		deleteAiDataFetching: deleteAiDataResult.fetching,
	};
}
