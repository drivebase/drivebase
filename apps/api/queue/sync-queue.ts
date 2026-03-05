import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";

export interface SyncJobData {
	providerId: string;
	workspaceId: string;
	userId: string;
	recursive?: boolean;
	pruneDeleted?: boolean;
}

export interface WorkspaceAutoSyncJobData {
	workspaceId: string;
}

export type SyncQueueJobData = SyncJobData | WorkspaceAutoSyncJobData;

const WORKSPACE_AUTO_SYNC_JOB_NAME = "sync-workspace-auto";

function getWorkspaceAutoSyncJobId(workspaceId: string) {
	return `workspace-auto-sync:${workspaceId}`;
}

let syncQueue: Queue<SyncQueueJobData> | null = null;

/**
 * Get or create the sync queue
 */
export function getSyncQueue(): Queue<SyncQueueJobData> {
	if (!syncQueue) {
		syncQueue = new Queue<SyncQueueJobData>("sync", {
			connection: createBullMQConnection(),
			defaultJobOptions: {
				attempts: 2,
				backoff: {
					type: "exponential",
					delay: 10000,
				},
				removeOnComplete: { count: 50 },
				removeOnFail: { count: 100 },
			},
		});
	}

	return syncQueue;
}

/**
 * Enqueue a provider sync job
 */
export async function enqueueSyncJob(data: SyncJobData) {
	const queue = getSyncQueue();
	return queue.add("sync-provider", data, {
		// Deduplicate by providerId — don't queue multiple syncs for the same provider
		jobId: `sync-${data.providerId}`,
	});
}

export async function upsertWorkspaceAutoSyncSchedule(
	workspaceId: string,
	cron: string,
) {
	const queue = getSyncQueue();
	const jobId = getWorkspaceAutoSyncJobId(workspaceId);

	const repeatableJobs = await queue.getRepeatableJobs();
	for (const repeatableJob of repeatableJobs) {
		if (
			repeatableJob.name === WORKSPACE_AUTO_SYNC_JOB_NAME &&
			repeatableJob.id === jobId
		) {
			await queue.removeRepeatableByKey(repeatableJob.key);
		}
	}

	return queue.add(
		WORKSPACE_AUTO_SYNC_JOB_NAME,
		{ workspaceId },
		{
			jobId,
			repeat: {
				pattern: cron,
				tz: "UTC",
			},
		},
	);
}

export async function removeWorkspaceAutoSyncSchedule(workspaceId?: string) {
	const queue = getSyncQueue();
	const repeatableJobs = await queue.getRepeatableJobs();
	const targetJobId = workspaceId
		? getWorkspaceAutoSyncJobId(workspaceId)
		: null;

	for (const repeatableJob of repeatableJobs) {
		if (repeatableJob.name !== WORKSPACE_AUTO_SYNC_JOB_NAME) {
			continue;
		}

		if (targetJobId && repeatableJob.id !== targetJobId) {
			continue;
		}

		await queue.removeRepeatableByKey(repeatableJob.key);
	}
}

/**
 * Close the sync queue
 */
export async function closeSyncQueue(): Promise<void> {
	if (syncQueue) {
		await syncQueue.close();
		syncQueue = null;
	}
}
