import { createClient as createSSEClient } from "graphql-sse";
import {
	Client,
	cacheExchange,
	fetchExchange,
	subscriptionExchange,
} from "urql";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";

const API_URL =
	import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:4000/graphql";

const sseClient = createSSEClient({
	url: API_URL,
	headers: () => {
		const token = localStorage.getItem("token");
		const workspaceId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
		return {
			authorization: token ? `Bearer ${token}` : "",
			"x-workspace-id": workspaceId || "",
		};
	},
});

export const client = new Client({
	url: API_URL,
	exchanges: [
		cacheExchange,
		fetchExchange,
		subscriptionExchange({
			forwardSubscription(operation) {
				return {
					subscribe: (sink) => {
						// biome-ignore lint/suspicious/noExplicitAny: library type mismatch between urql and graphql-sse
						const dispose = sseClient.subscribe(operation as any, sink as any);
						return {
							unsubscribe: dispose,
						};
					},
				};
			},
		}),
	],
	fetchOptions: () => {
		const token = localStorage.getItem("token");
		const workspaceId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
		return {
			headers: {
				authorization: token ? `Bearer ${token}` : "",
				"x-workspace-id": workspaceId || "",
			},
		};
	},
});
