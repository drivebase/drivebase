import type { Activity, Job, WorkspaceAiProgress } from "@drivebase/db";
import { createPubSub } from "graphql-yoga";

export type UploadProgressPayload = {
	sessionId: string;
	status: string;
	phase: string;
	receivedChunks: number;
	totalChunks: number;
	providerBytesTransferred: number;
	totalSize: number;
	errorMessage: string | null;
};

export type PubSubChannels = {
	uploadProgress: [sessionId: string, payload: UploadProgressPayload];
	activityUpdated: [workspaceId: string, payload: Job];
	activityCreated: [userId: string, payload: Activity];
	workspaceAiProgressUpdated: [
		workspaceId: string,
		payload: WorkspaceAiProgress,
	];
};

export const pubSub = createPubSub<PubSubChannels>();
