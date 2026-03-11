import type { Queue } from "bullmq";
import { registry } from "@/queue/registry";

export interface ExtractionJobData {
	nodeId: string;
	workspaceId: string;
	/** The drivebase job record ID for progress tracking (bulk indexing only) */
	trackingJobId?: string;
}

export const EXTRACTION_QUEUE_NAME = "extraction";

export const EXTRACTION_QUEUE_OPTIONS = {
	attempts: 3,
	backoff: { type: "exponential" as const, delay: 5000 },
	removeOnComplete: { count: 200 },
	removeOnFail: { count: 500 },
};

export function getExtractionQueue(): Queue<ExtractionJobData> {
	return registry.getQueue<ExtractionJobData>(EXTRACTION_QUEUE_NAME);
}
