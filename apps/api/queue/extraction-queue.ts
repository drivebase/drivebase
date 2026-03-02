import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";

export interface ExtractionJobData {
	nodeId: string;
	workspaceId: string;
	/** The drivebase job record ID for progress tracking (bulk indexing only) */
	trackingJobId?: string;
}

let extractionQueue: Queue<ExtractionJobData> | null = null;

export function getExtractionQueue(): Queue<ExtractionJobData> {
	if (!extractionQueue) {
		extractionQueue = new Queue<ExtractionJobData>("extraction", {
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

	return extractionQueue;
}

export async function closeExtractionQueue(): Promise<void> {
	if (extractionQueue) {
		await extractionQueue.close();
		extractionQueue = null;
	}
}
