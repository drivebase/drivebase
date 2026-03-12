import type { Queue } from "bullmq";
import { registry } from "@/queue/registry";

export type TransferOperation = "cut" | "copy";

interface BaseTransferJobData {
	jobId: string;
	workspaceId: string;
	userId: string;
	parentJobId?: string;
}

export interface ProviderFileTransferJobData extends BaseTransferJobData {
	entity: "file";
	fileId: string;
	targetProviderId: string;
	targetFolderId?: string | null;
	operation: TransferOperation;
}

export interface ProviderFolderTransferJobData extends BaseTransferJobData {
	entity: "folder";
	folderId: string;
	targetFolderId?: string | null;
	operation: TransferOperation;
}

export type ProviderTransferJobData =
	| ProviderFileTransferJobData
	| ProviderFolderTransferJobData;

interface BuildTransferQueueJobIdInput {
	jobId: string;
	entity: ProviderTransferJobData["entity"];
}

export function isFileTransferJobData(
	data: ProviderTransferJobData,
): data is ProviderFileTransferJobData {
	return data.entity === "file";
}

export function buildTransferQueueJobId(
	fileId: string,
	targetProviderId: string,
): string;
export function buildTransferQueueJobId(
	input: BuildTransferQueueJobIdInput,
): string;
export function buildTransferQueueJobId(
	inputOrFileId: BuildTransferQueueJobIdInput | string,
	targetProviderId?: string,
): string {
	if (typeof inputOrFileId === "string") {
		return `file-transfer:${inputOrFileId}:${targetProviderId ?? "unknown"}`;
	}
	return `provider-transfer:${inputOrFileId.entity}:${inputOrFileId.jobId}`;
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
