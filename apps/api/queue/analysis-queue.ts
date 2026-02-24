import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";

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

export async function closeAnalysisQueue(): Promise<void> {
	if (analysisQueue) {
		await analysisQueue.close();
		analysisQueue = null;
	}
}
