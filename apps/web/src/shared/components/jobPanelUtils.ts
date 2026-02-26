import { type Job, JobStatus } from "@/gql/graphql";

const HIDDEN_JOBS_STORAGE_PREFIX = "job_panel_hidden_jobs_v1";

export type HiddenJobsMap = Record<string, true>;

export function getHiddenJobsStorageKey(workspaceId: string | null): string {
	return `${HIDDEN_JOBS_STORAGE_PREFIX}:${workspaceId ?? "global"}`;
}

export function getInitialHiddenJobs(
	workspaceId: string | null,
): HiddenJobsMap {
	const raw = localStorage.getItem(getHiddenJobsStorageKey(workspaceId));
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		const result: HiddenJobsMap = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (value === true) {
				result[key] = true;
			}
		}
		return result;
	} catch {
		return {};
	}
}

export function getHiddenJobKey(job: Job): string {
	return `job:${job.id}:${job.updatedAt}`;
}

export function isTerminalJob(job: Job): boolean {
	return job.status === JobStatus.Completed || job.status === JobStatus.Error;
}

export function getStatusLabel(job: Job): string {
	if (job.status === JobStatus.Running) return "Running";
	if (job.status === JobStatus.Pending) return "Pending";
	if (job.status === JobStatus.Completed) return "Completed";
	return "Error";
}

export function getProgressIndicatorClass(status: JobStatus): string {
	if (status === JobStatus.Error) return "bg-destructive";
	if (status === JobStatus.Completed) return "bg-emerald-600";
	return "bg-primary";
}

export function getRetryLabel(job: Job): string | null {
	if (job.status !== JobStatus.Error || !job.metadata) return null;
	if (typeof job.metadata !== "object" || Array.isArray(job.metadata)) {
		return null;
	}

	const retryAttempt = job.metadata.retryAttempt;
	const retryMax = job.metadata.retryMax;
	const willRetry = job.metadata.willRetry;
	if (
		typeof retryAttempt !== "number" ||
		typeof retryMax !== "number" ||
		typeof willRetry !== "boolean"
	) {
		return null;
	}

	return willRetry
		? `Retrying ${retryAttempt}/${retryMax}`
		: `Failed ${retryAttempt}/${retryMax}`;
}
