import type { Job } from "@drivebase/db";
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
};

export const pubSub = createPubSub<PubSubChannels>();
