import { useEffect, useMemo, useState } from "react";
import { useQuery, useSubscription } from "urql";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
	ACTIVE_JOBS_QUERY,
	JOB_UPDATED_SUBSCRIPTION,
} from "@/shared/api/activity";
import {
	getActiveWorkspaceId,
	WORKSPACE_AI_PROGRESS_UPDATED_SUBSCRIPTION,
	useDeleteWorkspaceAiData,
	usePrepareWorkspaceAiModels,
	useStartWorkspaceAiProcessing,
	useStopWorkspaceAiProcessing,
	useUpdateWorkspaceAiSettings,
	useWorkspaceAiProgress,
	useWorkspaceAiSettings,
	useWorkspaceMembers,
	useWorkspaces,
} from "@/features/workspaces";
import { AnalysisModelTier, WorkspaceMemberRole } from "@/gql/graphql";

const TIER_OPTIONS: AnalysisModelTier[] = [
	AnalysisModelTier.Lightweight,
	AnalysisModelTier.Medium,
	AnalysisModelTier.Heavy,
];

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown";
	return date.toLocaleString();
}

export function AiSettingsView() {
	const [workspacesResult] = useWorkspaces(false);
	const activeWorkspaceId = getActiveWorkspaceId();
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
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

	const settings = settingsResult.data?.workspaceAiSettings;
	const progress =
		aiProgressSubData?.workspaceAiProgressUpdated ??
		progressResult.data?.workspaceAiProgress;
	const isProcessingActive =
		(progress?.pendingFiles ?? 0) > 0 || (progress?.runningFiles ?? 0) > 0;
	const isFullyProcessed = (progress?.completionPct ?? 0) >= 100;
	const hasAiData =
		(progress?.pendingFiles ?? 0) +
			(progress?.runningFiles ?? 0) +
			(progress?.completedFiles ?? 0) +
			(progress?.failedFiles ?? 0) +
			(progress?.skippedFiles ?? 0) >
		0;

	const [embeddingTier, setEmbeddingTier] = useState<AnalysisModelTier>(
		AnalysisModelTier.Medium,
	);
	const [maxConcurrency, setMaxConcurrency] = useState("2");
	const requiresModelDownload = Boolean(
		(settings?.embeddingTier && settings.embeddingTier !== embeddingTier) ||
			(settings?.ocrTier && settings.ocrTier !== embeddingTier) ||
			(settings?.objectTier && settings.objectTier !== embeddingTier),
	);

	useEffect(() => {
		if (!settings) return;
		setEmbeddingTier(settings.embeddingTier);
		setMaxConcurrency(String(settings.maxConcurrency));
	}, [settings]);

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
		if (!latestModelJob) return;
		if (latestModelJob.type !== "ai_model_download") return;
		if (latestModelJob.status !== "COMPLETED") return;

		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	}, [latestModelJob, reexecuteProgress, reexecuteSettings]);

	const hasModelsReady = settings?.modelsReady ?? false;

	const handleDownloadModels = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const persisted = await updateSettings({
			input: {
				workspaceId,
				embeddingTier,
				ocrTier: embeddingTier,
				objectTier: embeddingTier,
			},
		});
		if (persisted.error || !persisted.data?.updateWorkspaceAiSettings) {
			return;
		}
		const result = await prepareModels({ workspaceId });
		if (result.error || !result.data?.prepareWorkspaceAiModels) {
			return;
		}
		reexecuteSettings({ requestPolicy: "network-only" });
	};

	const handleSave = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const parsedConcurrency = Number.parseInt(maxConcurrency, 10);
		if (Number.isNaN(parsedConcurrency) || parsedConcurrency < 1) {
			setMaxConcurrency("1");
			return;
		}

		const result = await updateSettings({
			input: {
				workspaceId,
				embeddingTier,
				ocrTier: embeddingTier,
				objectTier: embeddingTier,
				maxConcurrency: parsedConcurrency,
			},
		});

		if (result.error || !result.data?.updateWorkspaceAiSettings) {
			return;
		}
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleStartProcessing = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await startProcessing({ workspaceId });
		if (result.error || !result.data?.startWorkspaceAiProcessing) {
			return;
		}
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleStopProcessing = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await stopProcessing({ workspaceId });
		if (result.error || !result.data?.stopWorkspaceAiProcessing) {
			return;
		}
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleToggleAiProcessing = async (enabled: boolean) => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await updateSettings({
			input: {
				workspaceId,
				enabled,
			},
		});
		if (result.error || !result.data?.updateWorkspaceAiSettings) {
			return;
		}
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	const handleDeleteAiData = async () => {
		if (!workspaceId || !canManageWorkspace) return;
		const result = await deleteAiData({ workspaceId });
		if (result.error || !result.data?.deleteWorkspaceAiData) {
			return;
		}
		reexecuteSettings({ requestPolicy: "network-only" });
		reexecuteProgress({ requestPolicy: "network-only" });
	};

	if (!activeWorkspace) {
		return (
			<div className="space-y-2">
				<h3 className="text-lg font-medium">AI</h3>
				<p className="text-sm text-muted-foreground">No workspace selected.</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div className="flex items-center justify-between gap-4">
					<div className="space-y-1">
						<h3 className="text-lg font-medium">AI Processing</h3>
						<p className="text-sm text-muted-foreground">
							Turn AI processing on or off for this workspace.
						</p>
					</div>
					<Switch
						checked={Boolean(settings?.enabled)}
						disabled={!canManageWorkspace || updateSettingsResult.fetching}
						onCheckedChange={handleToggleAiProcessing}
					/>
				</div>
			</section>
			<Separator />

			{hasModelsReady ? (
				<section className="space-y-4">
					<div className="space-y-1">
						<h3 className="text-lg font-medium">Progress</h3>
						<p className="text-sm text-muted-foreground">
							Live processing progress for eligible files.
						</p>
					</div>
					<div className="flex items-end justify-between gap-4">
						<div>
							<p className="text-4xl font-semibold">
								{progress?.completionPct?.toFixed(1) ?? "0.0"}%
							</p>
							<p className="text-sm text-muted-foreground">
								{progress?.processedFiles ?? 0} / {progress?.eligibleFiles ?? 0}{" "}
								eligible files processed
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								reexecuteProgress({ requestPolicy: "network-only" })
							}
						>
							Refresh
						</Button>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={handleStartProcessing}
							disabled={
								!canManageWorkspace ||
								startProcessingResult.fetching ||
								!settings?.enabled ||
								!hasModelsReady ||
								Boolean(requiresModelDownload) ||
								isFullyProcessed ||
								isProcessingActive
							}
						>
							Start processing
						</Button>
						<Button
							variant="outline"
							onClick={handleStopProcessing}
							disabled={
								!canManageWorkspace ||
								stopProcessingResult.fetching ||
								!isProcessingActive
							}
						>
							Stop processing
						</Button>
					</div>

					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">
							Pending: {progress?.pendingFiles ?? 0}
						</Badge>
						<Badge variant="secondary">
							Running: {progress?.runningFiles ?? 0}
						</Badge>
						<Badge variant="secondary">
							Completed: {progress?.completedFiles ?? 0}
						</Badge>
						<Badge variant="secondary">
							Failed: {progress?.failedFiles ?? 0}
						</Badge>
						<Badge variant="secondary">
							Skipped: {progress?.skippedFiles ?? 0}
						</Badge>
					</div>

					<p className="text-xs text-muted-foreground">
						Last updated:{" "}
						{progress?.updatedAt ? formatDate(progress.updatedAt) : "Unknown"}
					</p>
				</section>
			) : null}

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
							onClick={handleDownloadModels}
							disabled={!canManageWorkspace || prepareModelsResult.fetching}
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
										setEmbeddingTier(value as AnalysisModelTier)
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
								onChange={(event) => setMaxConcurrency(event.target.value)}
								disabled={!canManageWorkspace}
								inputMode="numeric"
							/>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={handleSave}
								disabled={
									!canManageWorkspace ||
									updateSettingsResult.fetching ||
									requiresModelDownload
								}
							>
								Save AI settings
							</Button>
							{requiresModelDownload ? (
								<Button
									variant="outline"
									onClick={handleDownloadModels}
									disabled={!canManageWorkspace || prepareModelsResult.fetching}
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
											deleteAiDataResult.fetching ||
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
											onClick={handleDeleteAiData}
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
		</div>
	);
}
