import type { Queue } from "bullmq";
import { registry } from "@/queue/registry";

export interface UploadJobData {
	sessionId: string;
	fileId: string | null;
	providerId: string;
	assembledFilePath: string;
	fileName: string;
	mimeType: string;
	totalSize: number;
}

export const UPLOAD_QUEUE_NAME = "uploads";

export const UPLOAD_QUEUE_OPTIONS = {
	attempts: 3,
	backoff: { type: "exponential" as const, delay: 5000 },
	removeOnComplete: { count: 100 },
	removeOnFail: { count: 200 },
};

export function getUploadQueue(): Queue<UploadJobData> {
	return registry.getQueue<UploadJobData>(UPLOAD_QUEUE_NAME);
}
