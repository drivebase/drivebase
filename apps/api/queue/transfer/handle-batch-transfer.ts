import { getDb, jobs } from "@drivebase/db";
import { inArray } from "drizzle-orm";
import type { ProviderBatchTransferJobData } from "@/queue/transfer/queue";
import { logger } from "@/utils/runtime/logger";
import { markFolderSubtreeDeleted } from "./db-ops";
import { subscribeChildCompletion } from "./job-events";
import type { JobContext } from "./types";
import { BATCH_STALL_TIMEOUT_MS, SAFETY_POLL_INTERVAL_MS } from "./types";
import { sleep } from "./utils";

export async function handleBatchTransfer(
	ctx: JobContext,
	data: ProviderBatchTransferJobData,
) {
	const db = getDb();
	const {
		activityService,
		providerService,
		jobId,
		workspaceId,
		userId,
		assertNotCancelled,
	} = ctx;
	const { childJobIds, operation, parentJobId } = data;
	const totalFiles = childJobIds.length;
	const verb = operation === "cut" ? "Moving" : "Copying";

	// The visible batch job is `parentJobId` — this monitor job is hidden.
	// All progress updates go to the visible batch job.
	const visibleJobId = parentJobId ?? jobId;

	async function updateBatch(input: {
		progress?: number;
		message?: string;
		status?: "pending" | "running" | "completed" | "error";
		metadata?: Record<string, unknown>;
	}) {
		await assertNotCancelled();
		await activityService.update(visibleJobId, input);
	}

	await updateBatch({
		status: "running",
		progress: 0,
		message: `${verb} 0 of ${totalFiles} files`,
		metadata: {
			phase: "monitoring",
			entity: "batch",
			operation,
			totalFiles,
			completedFiles: 0,
			failedFiles: 0,
		},
	});

	let lastChangeAt = Date.now();
	let lastReportedProgress = -1;
	let lastMessage = "";
	let completedCount = 0;
	let failedCount = 0;

	const pending = new Set(childJobIds);

	const sub = await subscribeChildCompletion(jobId, (msg) => {
		if (!pending.delete(msg.childJobId)) return;
		if (msg.status === "completed") completedCount++;
		else failedCount++;
		lastChangeAt = Date.now();
	});

	try {
		while (pending.size > 0) {
			await assertNotCancelled();

			const finishedCount = completedCount + failedCount;
			const progress = totalFiles > 0 ? finishedCount / totalFiles : 1;

			let message: string;
			if (failedCount > 0 && pending.size > 0) {
				message = `${verb} ${completedCount} of ${totalFiles} files (${failedCount} failed)`;
			} else {
				message = `${verb} ${finishedCount} of ${totalFiles} files`;
			}

			if (
				message !== lastMessage ||
				Math.abs(progress - lastReportedProgress) >= 0.01
			) {
				await updateBatch({
					progress,
					message,
					metadata: {
						phase: "monitoring",
						entity: "batch",
						operation,
						totalFiles,
						completedFiles: completedCount,
						failedFiles: failedCount,
					},
				});
				lastMessage = message;
				lastReportedProgress = progress;
			}

			// Stall guard
			if (Date.now() - lastChangeAt > BATCH_STALL_TIMEOUT_MS) {
				logger.error({
					msg: "[transfer:batch] stalled — no progress for timeout period",
					jobId,
					totalFiles,
					completed: completedCount,
					failed: failedCount,
					pending: pending.size,
				});
				await activityService.fail(
					visibleJobId,
					`Transfer stalled: ${completedCount} of ${totalFiles} completed, ${pending.size} stuck`,
				);
				if (visibleJobId !== jobId) {
					await activityService.complete(jobId, "Batch monitor stalled");
				}
				return;
			}

			// Safety-net DB poll
			await sleep(SAFETY_POLL_INTERVAL_MS);
			if (pending.size === 0) break;

			const childRows = await db
				.select({ id: jobs.id, status: jobs.status })
				.from(jobs)
				.where(inArray(jobs.id, [...pending]));

			for (const row of childRows) {
				if (row.status === "completed" || row.status === "error") {
					if (pending.delete(row.id)) {
						if (row.status === "completed") completedCount++;
						else failedCount++;
						lastChangeAt = Date.now();
					}
				}
			}
		}
	} finally {
		await sub.unsubscribe();
	}

	// Clean up source folders for cut operations
	if (operation === "cut" && data.sourceFolders?.length) {
		await updateBatch({
			progress: 1,
			message: "Cleaning up source folders",
		});
		for (const sf of data.sourceFolders) {
			try {
				await markFolderSubtreeDeleted(
					workspaceId,
					sf.providerId,
					sf.virtualPath,
				);
				const record = await providerService.getProvider(
					sf.providerId,
					userId,
					workspaceId,
				);
				const provider = await providerService.getProviderInstance(record);
				try {
					await provider.delete({
						remoteId: sf.remoteId,
						isFolder: true,
					});
				} catch (deleteError) {
					logger.warn({
						msg: "[transfer:batch] source folder deletion failed; remote orphan remains",
						jobId,
						folderId: sf.id,
						error:
							deleteError instanceof Error
								? deleteError.message
								: String(deleteError),
					});
				} finally {
					await provider.cleanup().catch(() => {});
				}
			} catch (cleanupError) {
				logger.warn({
					msg: "[transfer:batch] source folder cleanup failed",
					jobId,
					folderId: sf.id,
					error:
						cleanupError instanceof Error
							? cleanupError.message
							: String(cleanupError),
				});
			}
		}
	}

	const hasFailed = failedCount > 0;
	const summaryMessage = hasFailed
		? `${completedCount} of ${totalFiles} files transferred, ${failedCount} failed`
		: `${completedCount} files transferred`;

	if (hasFailed) {
		await activityService.fail(visibleJobId, summaryMessage);
	} else {
		await activityService.complete(visibleJobId, summaryMessage);
	}

	// Collect error details from failed child jobs for the activity log
	let errors: Array<{ jobId: string; title: string; error: string }> = [];
	if (hasFailed) {
		const failedRows = await db
			.select({
				id: jobs.id,
				title: jobs.title,
				message: jobs.message,
			})
			.from(jobs)
			.where(inArray(jobs.id, childJobIds));
		errors = failedRows
			.filter((r) => r.message && r.title)
			.filter(
				(_, idx) =>
					// Only include jobs that actually errored (check via our tracked state)
					// We query all and rely on message content, but limit to 50
					idx < 50,
			)
			.map((r) => ({
				jobId: r.id,
				title: r.title ?? "",
				error: r.message ?? "",
			}));
	}

	await activityService
		.log({
			kind: hasFailed ? "transfer.batch.failed" : "transfer.batch.completed",
			title: hasFailed
				? "Batch transfer completed with errors"
				: "Batch transfer completed",
			summary: summaryMessage,
			status: hasFailed ? "error" : "success",
			userId,
			workspaceId,
			details: {
				jobId: visibleJobId,
				operation,
				totalFiles,
				completedFiles: completedCount,
				failedFiles: failedCount,
				...(errors.length > 0 ? { errors } : {}),
			},
		})
		.catch(() => {});

	if (visibleJobId !== jobId) {
		await activityService.complete(jobId, "Batch monitor done");
	}
}
