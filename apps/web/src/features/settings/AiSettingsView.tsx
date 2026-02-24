import { useEffect, useMemo, useState } from "react";
import { useQuery, useSubscription } from "urql";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
	usePrepareWorkspaceAiModels,
	useStartWorkspaceAiProcessing,
	useUpdateWorkspaceAiSettings,
	useWorkspaceAiProgress,
	useWorkspaceAiSettings,
	useWorkspaceMembers,
	useWorkspaces,
} from "@/features/workspaces";
import { AnalysisModelTier, WorkspaceMemberRole } from "@/gql/graphql";

const TIER_OPTIONS: AnalysisModelTier[] = [AnalysisModelTier.Medium];

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
	const [{ data: activeJobsData }] = useQuery({
		query: ACTIVE_JOBS_QUERY,
		pause: !workspaceId,
	});
	const [{ data: jobUpdatedData }] = useSubscription({
		query: JOB_UPDATED_SUBSCRIPTION,
		pause: !workspaceId,
	});

	const settings = settingsResult.data?.workspaceAiSettings;
	const progress = progressResult.data?.workspaceAiProgress;

	const [embeddingTier, setEmbeddingTier] = useState<AnalysisModelTier>(
		AnalysisModelTier.Medium,
	);
	const [ocrTier, setOcrTier] = useState<AnalysisModelTier>(
		AnalysisModelTier.Medium,
	);
	const [objectTier, setObjectTier] = useState<AnalysisModelTier>(
		AnalysisModelTier.Medium,
	);
	const [maxConcurrency, setMaxConcurrency] = useState("2");

	useEffect(() => {
		if (!settings) return;
		setEmbeddingTier(settings.embeddingTier);
		setOcrTier(settings.ocrTier);
		setObjectTier(settings.objectTier);
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
				ocrTier,
				objectTier,
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
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Label>AI processing</Label>
								<p className="text-xs text-muted-foreground">
									Use start processing to enqueue analysis for eligible files.
								</p>
							</div>
							<Badge variant={settings?.enabled ? "default" : "secondary"}>
								{settings?.enabled ? "Enabled" : "Disabled"}
							</Badge>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Embeddings tier</Label>
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
							<div className="space-y-2">
								<Label>OCR tier</Label>
								<Select
									value={ocrTier}
									onValueChange={(value) =>
										setOcrTier(value as AnalysisModelTier)
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
							<div className="space-y-2">
								<Label>Object detection tier</Label>
								<Select
									value={objectTier}
									onValueChange={(value) =>
										setObjectTier(value as AnalysisModelTier)
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
							<div className="space-y-2">
								<Label>Max concurrency</Label>
								<input
									className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
									value={maxConcurrency}
									onChange={(event) => setMaxConcurrency(event.target.value)}
									disabled={!canManageWorkspace}
									inputMode="numeric"
								/>
							</div>
						</div>

						<div className="flex gap-2">
							<Button
								onClick={handleSave}
								disabled={!canManageWorkspace || updateSettingsResult.fetching}
							>
								Save AI settings
							</Button>
							<Button
								variant="outline"
								onClick={handleStartProcessing}
								disabled={!canManageWorkspace || startProcessingResult.fetching}
							>
								Start processing
							</Button>
						</div>
					</>
				)}
			</section>
		</div>
	);
}
