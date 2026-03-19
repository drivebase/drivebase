import type { Job } from "@drivebase/db";
import type { ActivityService } from "@/service/activity";
import type { ProviderService } from "@/service/provider";

export const DEFAULT_TRANSFER_CHUNK_SIZE = 8 * 1024 * 1024;
export const BATCH_POLL_INTERVAL_MS = 1000;
export const BATCH_STALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const ENQUEUE_BATCH_SIZE = 50;
export const PERSIST_BATCH_SIZE = 10;
export const PERSIST_INTERVAL_MS = 2000;
export const SAFETY_POLL_INTERVAL_MS = 15_000;
export const FILE_CONCURRENCY = 5;

export interface FileTransferCacheManifest {
	fileId: string;
	sourceProviderId: string;
	targetProviderId: string;
	totalSize: number;
	downloadedBytes: number;
	uploadedBytes: number;
	multipart?: {
		uploadId: string;
		remoteId: string;
		finalRemoteId?: string;
		parts: Array<{ partNumber: number; etag: string; size: number }>;
	};
}

export interface JobContext {
	activityService: ActivityService;
	providerService: ProviderService;
	jobId: string;
	workspaceId: string;
	userId: string;
	assertNotCancelled: () => Promise<void>;
	updateActivity: (input: {
		progress?: number;
		message?: string;
		status?: Job["status"];
		metadata?: Record<string, unknown>;
	}) => Promise<void>;
}
