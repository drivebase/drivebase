import type { Queue } from "bullmq";
import type { RestoreTier } from "@/service/file/lifecycle/shared/types";
import { registry } from "@/queue/registry";

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

export const FILE_LIFECYCLE_QUEUE_NAME = "file-lifecycle";

export const FILE_LIFECYCLE_QUEUE_OPTIONS = {
	attempts: 3,
	backoff: { type: "exponential" as const, delay: 5000 },
	removeOnComplete: { count: 100 },
	removeOnFail: { count: 200 },
};

export function getFileLifecycleQueue(): Queue<FileLifecycleJobData> {
	return registry.getQueue<FileLifecycleJobData>(FILE_LIFECYCLE_QUEUE_NAME);
}
