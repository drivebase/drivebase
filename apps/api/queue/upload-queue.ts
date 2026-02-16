import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";

export interface UploadJobData {
	sessionId: string;
	fileId: string | null;
	providerId: string;
	assembledFilePath: string;
	fileName: string;
	mimeType: string;
	totalSize: number;
}

let uploadQueue: Queue<UploadJobData> | null = null;

/**
 * Get or create the upload queue
 */
export function getUploadQueue(): Queue<UploadJobData> {
	if (!uploadQueue) {
		uploadQueue = new Queue<UploadJobData>("uploads", {
			connection: createBullMQConnection(),
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 5000,
				},
				removeOnComplete: { count: 100 },
				removeOnFail: { count: 200 },
			},
		});
	}

	return uploadQueue;
}

/**
 * Close the upload queue
 */
export async function closeUploadQueue(): Promise<void> {
	if (uploadQueue) {
		await uploadQueue.close();
		uploadQueue = null;
	}
}
