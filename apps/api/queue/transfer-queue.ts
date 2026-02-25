import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";

export interface ProviderTransferJobData {
	jobId: string;
	workspaceId: string;
	userId: string;
	fileId: string;
	targetProviderId: string;
}

export function buildTransferQueueJobId(
	fileId: string,
	targetProviderId: string,
): string {
	return `file-transfer:${fileId}:${targetProviderId}`;
}

let transferQueue: Queue<ProviderTransferJobData> | null = null;

export function getTransferQueue(): Queue<ProviderTransferJobData> {
	if (!transferQueue) {
		transferQueue = new Queue<ProviderTransferJobData>("provider-transfers", {
			connection: createBullMQConnection(),
			defaultJobOptions: {
				attempts: 5,
				backoff: {
					type: "exponential",
					delay: 5000,
				},
				removeOnComplete: { count: 100 },
				removeOnFail: { count: 200 },
			},
		});
	}

	return transferQueue;
}

export async function closeTransferQueue(): Promise<void> {
	if (transferQueue) {
		await transferQueue.close();
		transferQueue = null;
	}
}
