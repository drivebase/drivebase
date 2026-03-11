import type { Queue } from "bullmq";
import { registry } from "@/queue/registry";

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

export const TRANSFER_QUEUE_NAME = "provider-transfers";

export const TRANSFER_QUEUE_OPTIONS = {
	attempts: 5,
	backoff: { type: "exponential" as const, delay: 5000 },
	removeOnComplete: { count: 100 },
	removeOnFail: { count: 200 },
};

export function getTransferQueue(): Queue<ProviderTransferJobData> {
	return registry.getQueue<ProviderTransferJobData>(TRANSFER_QUEUE_NAME);
}
