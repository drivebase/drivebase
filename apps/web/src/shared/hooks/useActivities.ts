import { useEffect, useMemo } from "react";
import { useQuery, useSubscription } from "urql";
import {
	getActiveWorkspaceId,
	WORKSPACE_AI_PROGRESS_QUERY,
	WORKSPACE_AI_PROGRESS_UPDATED_SUBSCRIPTION,
} from "@/features/workspaces";
import { JobStatus } from "@/gql/graphql";
import {
	ACTIVE_JOBS_QUERY,
	JOB_UPDATED_SUBSCRIPTION,
} from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function useActivities() {
	const activeWorkspaceId = getActiveWorkspaceId();
	const aiProgressJobId = activeWorkspaceId
		? `ai-processing-${activeWorkspaceId}`
		: null;
	const jobs = useActivityStore((state) => state.jobs);
	const setJob = useActivityStore((state) => state.setJob);
	const removeJob = useActivityStore((state) => state.removeJob);

	const [{ data: activeJobsData }] = useQuery({
		query: ACTIVE_JOBS_QUERY,
	});

	const [{ data: jobUpdatedData }] = useSubscription({
		query: JOB_UPDATED_SUBSCRIPTION,
	});
	const [{ data: aiProgressData }] = useQuery({
		query: WORKSPACE_AI_PROGRESS_QUERY,
		variables: { workspaceId: activeWorkspaceId ?? "" },
		pause: !activeWorkspaceId,
	});
	const [{ data: aiProgressUpdatedData }] = useSubscription({
		query: WORKSPACE_AI_PROGRESS_UPDATED_SUBSCRIPTION,
		variables: { workspaceId: activeWorkspaceId ?? "" },
		pause: !activeWorkspaceId,
	});

	useEffect(() => {
		for (const job of activeJobsData?.activeJobs ?? []) {
			setJob(job);
		}
	}, [activeJobsData, setJob]);

	useEffect(() => {
		const job = jobUpdatedData?.jobUpdated;
		if (!job) return;

		setJob(job);
	}, [jobUpdatedData, setJob]);

	useEffect(() => {
		if (!activeWorkspaceId || !aiProgressJobId) return;

		const progress =
			aiProgressUpdatedData?.workspaceAiProgressUpdated ??
			aiProgressData?.workspaceAiProgress ??
			null;

		if (!progress) {
			removeJob(aiProgressJobId);
			return;
		}

		const hasInFlight =
			(progress.pendingFiles ?? 0) > 0 || (progress.runningFiles ?? 0) > 0;
		if (!hasInFlight) {
			removeJob(aiProgressJobId);
			return;
		}

		const completionPct = Math.max(
			0,
			Math.min(100, progress.completionPct ?? 0),
		);
		const now = new Date().toISOString();
		setJob({
			id: aiProgressJobId,
			type: "ai_processing",
			title: "AI file processing",
			message: `Processing ${progress.processedFiles}/${progress.eligibleFiles} files`,
			progress: completionPct / 100,
			status:
				(progress.runningFiles ?? 0) > 0
					? JobStatus.Running
					: JobStatus.Pending,
			metadata: {
				workspaceId: activeWorkspaceId,
				pendingFiles: progress.pendingFiles,
				runningFiles: progress.runningFiles,
				failedFiles: progress.failedFiles,
				skippedFiles: progress.skippedFiles,
				completedFiles: progress.completedFiles,
			},
			createdAt: now,
			updatedAt: now,
		});
	}, [
		activeWorkspaceId,
		aiProgressData?.workspaceAiProgress,
		aiProgressJobId,
		aiProgressUpdatedData?.workspaceAiProgressUpdated,
		removeJob,
		setJob,
	]);

	return useMemo(() => ({ jobs }), [jobs]);
}
