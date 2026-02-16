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
	providerSyncProgress: [
		providerId: string,
		payload: {
			providerId: string;
			processed: number;
			total?: number;
			message?: string;
			status: "running" | "completed" | "error";
		},
	];
	uploadProgress: [sessionId: string, payload: UploadProgressPayload];
};

export const pubSub = createPubSub<PubSubChannels>();
