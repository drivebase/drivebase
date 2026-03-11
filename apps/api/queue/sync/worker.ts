import {
	getDb,
	storageProviders,
	workspaceAutoSyncProviders,
	workspaces,
} from "@drivebase/db";
import { Worker } from "bullmq";
import { and, eq, inArray } from "drizzle-orm";
import { ActivityService } from "@/service/activity";
import { syncProvider } from "@/service/provider/mutation";
import { createBullMQConnection } from "@/redis/client";
import { logger } from "@/utils/runtime/logger";
import type {
	SyncJobData,
	SyncQueueJobData,
	WorkspaceAutoSyncJobData,
} from "@/queue/sync/queue";

async function processWorkspaceAutoSyncJob(
	data: WorkspaceAutoSyncJobData,
	jobId?: string,
) {
	const db = getDb();
	const startedAt = Date.now();

	logger.debug({
		msg: "Workspace auto-sync run started",
		workspaceId: data.workspaceId,
		jobId,
	});

	const [workspace] = await db
		.select({
			id: workspaces.id,
			ownerId: workspaces.ownerId,
			autoSyncEnabled: workspaces.autoSyncEnabled,
			autoSyncScope: workspaces.autoSyncScope,
		})
		.from(workspaces)
		.where(eq(workspaces.id, data.workspaceId))
		.limit(1);

	if (!workspace || !workspace.autoSyncEnabled) {
		logger.debug({
			msg: "Workspace auto-sync run skipped",
			workspaceId: data.workspaceId,
			jobId,
			reason: !workspace ? "workspace_not_found" : "auto_sync_disabled",
		});
		return;
	}

	const activityService = new ActivityService(db);

	try {
		let providers: Array<{ id: string }> = [];

		if (workspace.autoSyncScope === "all") {
			providers = await db
				.select({ id: storageProviders.id })
				.from(storageProviders)
				.where(
					and(
						eq(storageProviders.workspaceId, workspace.id),
						eq(storageProviders.isActive, true),
					),
				);
		} else {
			const selectedProviderIds = db
				.select({ providerId: workspaceAutoSyncProviders.providerId })
				.from(workspaceAutoSyncProviders)
				.where(eq(workspaceAutoSyncProviders.workspaceId, workspace.id));

			providers = await db
				.select({ id: storageProviders.id })
				.from(storageProviders)
				.where(
					and(
						eq(storageProviders.workspaceId, workspace.id),
						eq(storageProviders.isActive, true),
						inArray(storageProviders.id, selectedProviderIds),
					),
				);
		}

		let failedCount = 0;

		for (const provider of providers) {
			try {
				await syncProvider(db, provider.id, workspace.id, workspace.ownerId, {
					recursive: true,
					pruneDeleted: true,
					suppressActivity: true,
				});
			} catch (error) {
				failedCount += 1;
				logger.error({
					msg: "Workspace auto-sync provider run failed",
					workspaceId: workspace.id,
					providerId: provider.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (failedCount > 0) {
			throw new Error(
				`Workspace auto-sync failed for ${failedCount} providers`,
			);
		}

		const durationMs = Date.now() - startedAt;

		await activityService.log({
			kind: "workspace.auto_sync.completed",
			title: "Workspace auto-sync completed",
			summary: `${providers.length} provider(s) synced`,
			status: "success",
			userId: workspace.ownerId,
			workspaceId: workspace.id,
			details: {
				jobId,
				scope: workspace.autoSyncScope,
				providerCount: providers.length,
				failedCount,
				durationMs,
			},
		});

		logger.info({
			msg: "Workspace auto-sync run completed",
			workspaceId: workspace.id,
			jobId,
			scope: workspace.autoSyncScope,
			providerCount: providers.length,
			failedCount,
			durationMs,
		});
	} catch (error) {
		const durationMs = Date.now() - startedAt;
		const message = error instanceof Error ? error.message : String(error);

		await activityService.log({
			kind: "workspace.auto_sync.failed",
			title: "Workspace auto-sync failed",
			summary: message,
			status: "error",
			userId: workspace.ownerId,
			workspaceId: workspace.id,
			details: {
				jobId,
				scope: workspace.autoSyncScope,
				durationMs,
				error: message,
			},
		});

		throw error;
	}
}

export function createSyncWorker(): Worker<SyncQueueJobData> {
	const worker = new Worker<SyncQueueJobData>(
		"sync",
		async (job) => {
			if (job.name === "sync-workspace-auto") {
				await processWorkspaceAutoSyncJob(
					job.data as WorkspaceAutoSyncJobData,
					job.id,
				);
				return;
			}

			const { providerId, workspaceId, userId, recursive, pruneDeleted } =
				job.data as SyncJobData;

			logger.debug({
				msg: "Starting provider sync job",
				providerId,
				jobId: job.id,
			});

			const db = getDb();

			await syncProvider(db, providerId, workspaceId, userId, {
				recursive: recursive ?? true,
				pruneDeleted: pruneDeleted ?? true,
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

	worker.on("failed", (job, err) => {
		logger.error({
			msg: "Sync job failed",
			jobId: job?.id,
			providerId:
				job && "providerId" in job.data
					? (job.data.providerId as string)
					: undefined,
			workspaceId:
				job && "workspaceId" in job.data ? job.data.workspaceId : undefined,
			jobName: job?.name,
			error: err.message,
		});
	});

	return worker;
}
