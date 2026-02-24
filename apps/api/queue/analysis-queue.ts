import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";
import { logger } from "../utils/logger";

export interface FileAnalysisJobData {
	runId: string;
	workspaceId: string;
	fileId: string;
}

let analysisQueue: Queue<FileAnalysisJobData> | null = null;

export function getAnalysisQueue(): Queue<FileAnalysisJobData> {
	if (!analysisQueue) {
		analysisQueue = new Queue<FileAnalysisJobData>("file-analysis", {
			connection: createBullMQConnection(),
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 5000,
				},
				removeOnComplete: { count: 200 },
				removeOnFail: { count: 500 },
			},
		});
	}

	return analysisQueue;
}

export async function cancelWorkspaceAnalysisJobs(
	workspaceId: string,
): Promise<number> {
	const queue = getAnalysisQueue();
	const jobs = await queue.getJobs(["waiting", "delayed", "prioritized"]);
	let removed = 0;
	for (const job of jobs) {
		if (job.data.workspaceId !== workspaceId) {
			continue;
		}
		await job.remove();
		removed += 1;
	}
	logger.info({
		msg: "Cancelled queued workspace analysis jobs",
		workspaceId,
		removed,
	});
	return removed;
}

export async function closeAnalysisQueue(): Promise<void> {
	if (analysisQueue) {
		await analysisQueue.close();
		analysisQueue = null;
	}
}
