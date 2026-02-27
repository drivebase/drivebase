import { sleep, ValidationError } from "@drivebase/core";
import { files, getDb } from "@drivebase/db";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { createBullMQConnection } from "../redis/client";
import { ActivityService } from "../service/activity";
import { mapProviderLifecycleState } from "../service/file/lifecycle/shared/mapping";
import { ProviderService } from "../service/provider";
import { logger } from "../utils/logger";
import {
	type FileLifecycleJobData,
	getFileLifecycleQueue,
} from "./file-lifecycle-queue";

const RESTORE_POLL_ATTEMPTS = 12;
const RESTORE_POLL_DELAY_MS = 5000;

let fileLifecycleWorker: Worker<FileLifecycleJobData> | null = null;

export function startFileLifecycleWorker(): Worker<FileLifecycleJobData> {
	if (fileLifecycleWorker) {
		return fileLifecycleWorker;
	}

	fileLifecycleWorker = new Worker<FileLifecycleJobData>(
		"file-lifecycle",
		async (bullJob) => {
			const db = getDb();
			const activityService = new ActivityService(db);
			const providerService = new ProviderService(db);
			const { action, fileId, jobId, userId, workspaceId, days, tier } =
				bullJob.data;

			let provider: Awaited<
				ReturnType<ProviderService["getProviderInstance"]>
			> | null = null;

			try {
				await activityService.update(jobId, {
					status: "running",
					progress: 0,
					message:
						action === "archive" ? "Archiving file" : "Requesting restore",
					metadata: {
						action,
						phase: "prepare",
					},
				});

				const [file] = await db
					.select()
					.from(files)
					.where(eq(files.id, fileId))
					.limit(1);

				if (!file || file.nodeType !== "file") {
					await activityService.fail(jobId, "File not found");
					return;
				}

				const providerRecord = await providerService.getProvider(
					file.providerId,
					userId,
					workspaceId,
				);
				provider = await providerService.getProviderInstance(providerRecord);

				if (action === "archive") {
					if (!provider.archiveFile) {
						throw new ValidationError(
							"Provider does not support lifecycle operations",
						);
					}
					await provider.archiveFile(file.remoteId);

					await db
						.update(files)
						.set({
							lifecycleState: "archived",
							lifecycleCheckedAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(files.id, file.id));

					await activityService.complete(jobId, "File archived");
					await activityService.log({
						kind: "file.lifecycle.archived",
						title: "File archived",
						summary: file.name,
						status: "success",
						userId,
						workspaceId,
						details: {
							fileId: file.id,
							providerId: file.providerId,
							jobId,
						},
					});
					return;
				}

				if (!provider.requestRestore) {
					throw new ValidationError(
						"Provider does not support lifecycle operations",
					);
				}

				await provider.requestRestore(file.remoteId, {
					days: days ?? 7,
					tier: tier ?? "standard",
				});

				await db
					.update(files)
					.set({
						lifecycleState: "restore_requested",
						restoreRequestedAt: new Date(),
						lifecycleCheckedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(files.id, file.id));

				await activityService.update(jobId, {
					status: "running",
					progress: 0.2,
					message: "Restore requested",
					metadata: {
						action,
						phase: "requested",
						days: days ?? 7,
						tier: tier ?? "standard",
					},
				});

				if (!provider.getLifecycleState) {
					await activityService.complete(jobId, "Restore requested");
					return;
				}

				for (let attempt = 1; attempt <= RESTORE_POLL_ATTEMPTS; attempt += 1) {
					await sleep(RESTORE_POLL_DELAY_MS);
					const state = await provider.getLifecycleState(file.remoteId);
					const mapped = mapProviderLifecycleState(state);

					await db
						.update(files)
						.set({
							lifecycleState: mapped.lifecycleState,
							storageClass: mapped.storageClass,
							restoreRequestedAt: mapped.restoreRequestedAt,
							restoreExpiresAt: mapped.restoreExpiresAt,
							lifecycleCheckedAt: mapped.lifecycleCheckedAt,
							updatedAt: new Date(),
						})
						.where(eq(files.id, file.id));

					if (mapped.lifecycleState === "restored_temporary") {
						await activityService.complete(jobId, "Restore completed");
						await activityService.log({
							kind: "file.lifecycle.restore.ready",
							title: "File restore completed",
							summary: file.name,
							status: "success",
							userId,
							workspaceId,
							details: {
								fileId: file.id,
								providerId: file.providerId,
								jobId,
								restoreExpiresAt: mapped.restoreExpiresAt,
							},
						});
						return;
					}

					await activityService.update(jobId, {
						status: "running",
						progress: 0.2 + (attempt / RESTORE_POLL_ATTEMPTS) * 0.75,
						message: "Waiting for restore to complete",
						metadata: {
							action,
							phase: "polling",
							attempt,
							maxAttempts: RESTORE_POLL_ATTEMPTS,
							state: mapped.lifecycleState,
						},
					});
				}

				await activityService.complete(jobId, "Restore requested");
				await activityService.log({
					kind: "file.lifecycle.restore.requested",
					title: "File restore requested",
					summary: file.name,
					status: "info",
					userId,
					workspaceId,
					details: {
						fileId: file.id,
						providerId: file.providerId,
						jobId,
						days: days ?? 7,
						tier: tier ?? "standard",
					},
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error({
					msg: "File lifecycle job failed",
					jobId,
					fileId,
					action,
					error: message,
				});
				await activityService.fail(jobId, message);
				throw error;
			} finally {
				if (provider) {
					await provider.cleanup().catch(() => {});
				}
			}
		},
		{
			connection: createBullMQConnection(),
			concurrency: 2,
		},
	);

	fileLifecycleWorker.on("failed", (job, error) => {
		logger.error({
			msg: "File lifecycle worker failed",
			jobId: job?.id,
			error: error.message,
		});
	});

	logger.info("File lifecycle worker started");
	return fileLifecycleWorker;
}

export async function stopFileLifecycleWorker(): Promise<void> {
	if (fileLifecycleWorker) {
		await fileLifecycleWorker.close();
		fileLifecycleWorker = null;
		logger.info("File lifecycle worker stopped");
	}
}

export async function drainFileLifecycleQueue(
	workspaceId: string,
): Promise<void> {
	const queue = getFileLifecycleQueue();
	const jobs = await queue.getJobs(["waiting", "delayed", "prioritized"]);
	for (const job of jobs) {
		if (job.data.workspaceId !== workspaceId) {
			continue;
		}
		await job.remove();
	}
}
