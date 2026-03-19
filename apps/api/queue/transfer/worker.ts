import type { Job } from "@drivebase/db";
import { getDb } from "@drivebase/db";
import { Worker } from "bullmq";
import type { ProviderTransferJobData } from "@/queue/transfer/queue";
import {
	isBatchTransferJobData,
	isFileTransferJobData,
	isRootTransferJobData,
} from "@/queue/transfer/queue";
import { createBullMQConnection, getRedis } from "@/redis/client";
import { ActivityService } from "@/service/activity";
import { ProviderService } from "@/service/provider";
import {
	assertNotCancelled as assertJobNotCancelled,
	clearJobCancellation,
	JobCancelledError,
} from "@/utils/jobs/job-cancel";
import { logger } from "@/utils/runtime/logger";
import { publishChildCompletion } from "./job-events";
import { handleBatchTransfer } from "./handle-batch-transfer";
import { handleFileTransfer } from "./handle-file-transfer";
import { handleFolderTransfer } from "./handle-folder-transfer";
import { handleRootTransfer } from "./handle-root-transfer";
import type { JobContext } from "./types";
import { isNonRetryableTransferError, normalizeJobData } from "./utils";

export type { JobContext } from "./types";
export { handleRootTransfer } from "./handle-root-transfer";
export { handleFileTransfer } from "./handle-file-transfer";
export { handleFolderTransfer } from "./handle-folder-transfer";
export { handleBatchTransfer } from "./handle-batch-transfer";

export function createTransferWorker(): Worker<ProviderTransferJobData> {
	const worker = new Worker<ProviderTransferJobData>(
		"provider-transfers",
		async (bullJob) => {
			const db = getDb();
			const activityService = new ActivityService(db);
			const providerService = new ProviderService(db);
			const rawData = bullJob.data as { jobId?: string } | undefined;
			let jobId = rawData?.jobId ?? "";

			try {
				const data = normalizeJobData(bullJob.data);
				const { workspaceId, userId } = data;
				jobId = data.jobId;

				logger.debug({
					msg: "[transfer] job started",
					jobId,
					entity: data.entity,
					attempt: bullJob.attemptsMade + 1,
				});

				const assertNotCancelled = () => assertJobNotCancelled(jobId);
				const updateActivity = async (input: {
					progress?: number;
					message?: string;
					status?: Job["status"];
					metadata?: Record<string, unknown>;
				}) => {
					await assertNotCancelled();
					const isPaused = input.status === "paused";
					await activityService.update(jobId, {
						...input,
						suppressEvent: Boolean(data.parentJobId) && !isPaused,
					});
				};

				const ctx: JobContext = {
					activityService,
					providerService,
					jobId,
					workspaceId,
					userId,
					assertNotCancelled,
					updateActivity,
				};
				if (isRootTransferJobData(data)) {
					await handleRootTransfer(ctx, data);
				} else if (isBatchTransferJobData(data)) {
					await handleBatchTransfer(ctx, data);
				} else if (isFileTransferJobData(data)) {
					await handleFileTransfer(ctx, data);
					if (data.parentJobId) {
						await publishChildCompletion(
							getRedis(),
							data.parentJobId,
							jobId,
							"completed",
						).catch(() => {});
					}
				} else {
					await handleFolderTransfer(ctx, data);
					if (data.parentJobId) {
						await publishChildCompletion(
							getRedis(),
							data.parentJobId,
							jobId,
							"completed",
						).catch(() => {});
					}
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (error instanceof JobCancelledError) {
					if (jobId) {
						await activityService.update(jobId, {
							status: "error",
							message: "Transfer cancelled",
							metadata: {
								phase: "cancelled",
								cancelled: true,
							},
						});
					}
					return;
				}
				const nonRetryable = isNonRetryableTransferError(error);
				const currentAttempt = bullJob.attemptsMade + 1;
				const maxAttempts =
					typeof bullJob.opts.attempts === "number" ? bullJob.opts.attempts : 1;
				const willRetry = !nonRetryable && currentAttempt < maxAttempts;

				logger.error({
					msg: "Provider transfer job failed",
					jobId,
					error: message,
					retryAttempt: currentAttempt,
					retryMax: maxAttempts,
					willRetry,
					nonRetryable,
				});

				if (jobId) {
					if (willRetry) {
						await activityService.update(jobId, {
							status: "error",
							message: `Transfer failed. Retrying (${currentAttempt}/${maxAttempts})`,
							metadata: {
								phase: "retry",
								error: message,
								retryAttempt: currentAttempt,
								retryMax: maxAttempts,
								willRetry: true,
							},
						});
					} else {
						await activityService.update(jobId, {
							status: "error",
							message: nonRetryable
								? `Transfer failed: ${message}`
								: `Transfer failed after ${currentAttempt}/${maxAttempts} attempts`,
							metadata: {
								phase: "failed",
								error: message,
								retryAttempt: currentAttempt,
								retryMax: maxAttempts,
								willRetry: false,
								nonRetryable,
							},
						});
					}
				}
				if (nonRetryable) {
					bullJob.discard();
				}

				const parentId = (bullJob.data as { parentJobId?: string })
					?.parentJobId;
				if (parentId && jobId) {
					await publishChildCompletion(
						getRedis(),
						parentId,
						jobId,
						"error",
					).catch(() => {});
				}

				throw error;
			} finally {
				if (jobId) {
					await clearJobCancellation(jobId);
				}
			}
		},
		{
			connection: createBullMQConnection(),
			concurrency: 10,
		},
	);

	worker.on("failed", (job, error) => {
		logger.error({
			msg: "Transfer worker failed",
			jobId: job?.id,
			error: error.message,
		});
	});

	return worker;
}
