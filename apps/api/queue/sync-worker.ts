import { getDb } from "@drivebase/db";
import { Worker } from "bullmq";
import { createBullMQConnection } from "../redis/client";
import { syncProvider } from "../services/provider/provider-sync";
import { logger } from "../utils/logger";
import type { SyncJobData } from "./sync-queue";

let syncWorker: Worker<SyncJobData> | null = null;

/**
 * Start the sync worker
 */
export function startSyncWorker(): Worker<SyncJobData> {
	if (syncWorker) {
		return syncWorker;
	}

	syncWorker = new Worker<SyncJobData>(
		"sync",
		async (job) => {
			const { providerId, workspaceId, userId, recursive, pruneDeleted } =
				job.data;

			logger.info({
				msg: "Starting provider sync job",
				providerId,
				jobId: job.id,
			});

			const db = getDb();

			await syncProvider(db, providerId, workspaceId, userId, {
				recursive: recursive ?? true,
				pruneDeleted: pruneDeleted ?? false,
			});

			logger.info({
				msg: "Provider sync job completed",
				providerId,
				jobId: job.id,
			});
		},
		{
			connection: createBullMQConnection(),
			concurrency: 2,
		},
	);

	syncWorker.on("failed", (job, err) => {
		logger.error({
			msg: "Sync job failed",
			jobId: job?.id,
			providerId: job?.data.providerId,
			error: err.message,
		});
	});

	logger.info("Sync worker started");

	return syncWorker;
}

/**
 * Stop the sync worker
 */
export async function stopSyncWorker(): Promise<void> {
	if (syncWorker) {
		await syncWorker.close();
		syncWorker = null;
	}
}
