import { createPubSub } from "graphql-yoga";

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
};

export const pubSub = createPubSub<PubSubChannels>();
