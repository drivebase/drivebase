import { Queue } from "bullmq";
import { createBullMQConnection } from "../redis/client";
import type { RestoreTier } from "../service/file/lifecycle/shared/types";

export type FileLifecycleJobAction = "archive" | "restore";

export interface FileLifecycleJobData {
	jobId: string;
	workspaceId: string;
	userId: string;
	fileId: string;
	action: FileLifecycleJobAction;
	days?: number;
	tier?: RestoreTier;
}

export function buildFileLifecycleQueueJobId(
	action: FileLifecycleJobAction,
	fileId: string,
): string {
	return `file-lifecycle:${action}:${fileId}`;
}

let lifecycleQueue: Queue<FileLifecycleJobData> | null = null;

export function getFileLifecycleQueue(): Queue<FileLifecycleJobData> {
	if (!lifecycleQueue) {
		lifecycleQueue = new Queue<FileLifecycleJobData>("file-lifecycle", {
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

	return lifecycleQueue;
}

export async function closeFileLifecycleQueue(): Promise<void> {
	if (lifecycleQueue) {
		await lifecycleQueue.close();
		lifecycleQueue = null;
	}
}
