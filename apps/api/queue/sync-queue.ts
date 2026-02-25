import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";

export interface SyncJobData {
	providerId: string;
	workspaceId: string;
	userId: string;
	recursive?: boolean;
	pruneDeleted?: boolean;
}

let syncQueue: Queue<SyncJobData> | null = null;

/**
 * Get or create the sync queue
 */
export function getSyncQueue(): Queue<SyncJobData> {
	if (!syncQueue) {
		syncQueue = new Queue<SyncJobData>("sync", {
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

/**
 * Close the sync queue
 */
export async function closeSyncQueue(): Promise<void> {
	if (syncQueue) {
		await syncQueue.close();
		syncQueue = null;
	}
}
