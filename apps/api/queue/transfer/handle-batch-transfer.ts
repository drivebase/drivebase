import { getDb, jobs } from "@drivebase/db";
import { inArray } from "drizzle-orm";
import type { ProviderBatchTransferJobData } from "@/queue/transfer/queue";
import { logger } from "@/utils/runtime/logger";
import { markFolderSubtreeDeleted } from "./db-ops";
import type { JobContext } from "./types";
import { BATCH_POLL_INTERVAL_MS, BATCH_STALL_TIMEOUT_MS } from "./types";
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
	let lastObservedProgress = -1;
	let lastObservedFinishedCount = -1;
	let lastReportedProgress = -1;
	let lastMessage = "";

	while (true) {
		await assertNotCancelled();

		const childRows = await db
			.select({
				id: jobs.id,
				status: jobs.status,
				title: jobs.title,
				message: jobs.message,
				progress: jobs.progress,
			})
			.from(jobs)
			.where(inArray(jobs.id, childJobIds));

		const completed = childRows.filter((r) => r.status === "completed").length;
		const failed = childRows.filter((r) => r.status === "error").length;
		const active = childRows.filter(
			(r) =>
				r.status === "pending" ||
				r.status === "running" ||
				r.status === "paused",
		);
		const finishedCount = completed + failed;

		// Smooth progress: sum of individual file progresses
		const totalProgress = childRows.reduce(
			(sum, r) => sum + (r.progress ?? 0),
			0,
		);
		const progress = totalFiles > 0 ? totalProgress / totalFiles : 1;

		// Reset stall timer if progress increased or files finished
		if (
			progress > lastObservedProgress ||
			finishedCount > lastObservedFinishedCount
		) {
			lastChangeAt = Date.now();
			lastObservedProgress = progress;
			lastObservedFinishedCount = finishedCount;
		}

		// All children done - exit loop and finalize
		if (active.length === 0 && childRows.length === totalFiles) {
			break;
		}

		// Find the currently running job for display
		const running = childRows.find((r) => r.status === "running");
		const currentFileName =
			running?.title?.replace(/^(Move|Copy|Transfer)\s+/, "") ?? "";

		let message: string;
		if (failed > 0 && active.length > 0) {
			message = `${verb} ${completed} of ${totalFiles} files (${failed} failed)`;
		} else {
			message = currentFileName
				? `${verb} ${finishedCount} of ${totalFiles} files — ${currentFileName}`
				: `${verb} ${finishedCount} of ${totalFiles} files`;
		}

		// Throttle updates: only if message changed or progress jumped > 1%
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
					completedFiles: completed,
					failedFiles: failed,
				},
			});
			lastMessage = message;
			lastReportedProgress = progress;
		}

		// Stall guard — if nothing changes for 5 minutes, bail out
		if (Date.now() - lastChangeAt > BATCH_STALL_TIMEOUT_MS) {
			logger.error({
				msg: "[transfer:batch] stalled — no progress for timeout period",
				jobId,
				totalFiles,
				completed,
				failed,
				active: active.length,
			});
			await activityService.fail(
				visibleJobId,
				`Transfer stalled: ${completed} of ${totalFiles} completed, ${active.length} stuck`,
			);
			if (visibleJobId !== jobId) {
				await activityService.complete(jobId, "Batch monitor stalled");
			}
			return;
		}

		await sleep(BATCH_POLL_INTERVAL_MS);
	}

	// Finalize batch
	const finalRows = await db
		.select({ status: jobs.status })
		.from(jobs)
		.where(inArray(jobs.id, childJobIds));

	const completedCount = finalRows.filter(
		(r) => r.status === "completed",
	).length;
	const failedCount = finalRows.filter((r) => r.status === "error").length;

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

	if (failedCount > 0) {
		await activityService.fail(
			visibleJobId,
			`${completedCount} of ${totalFiles} files transferred, ${failedCount} failed`,
		);
	} else {
		await activityService.complete(
			visibleJobId,
			`${completedCount} files transferred`,
		);
	}

	if (visibleJobId !== jobId) {
		await activityService.complete(jobId, "Batch monitor done");
	}
}
