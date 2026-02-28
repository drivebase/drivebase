import { createClient as createSSEClient } from "graphql-sse";
import {
	Client,
	cacheExchange,
	type Exchange,
	fetchExchange,
	subscriptionExchange,
} from "urql";
import { map, pipe } from "wonka";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";

const API_URL = import.meta.env.VITE_PUBLIC_API_URL || "/graphql";

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

const ERROR_PREFIX_REGEX = /^\[(GraphQL|Network)\]\s*/;

const normalizeErrorMessageExchange: Exchange =
	({ forward }) =>
	(operations$) =>
		pipe(
			forward(operations$),
			map((result) => {
				const message = result.error?.message;
				if (!message) {
					return result;
				}
				// urql prefixes CombinedError.message with source markers like [GraphQL].
				(result.error as { message: string }).message = message.replace(
					ERROR_PREFIX_REGEX,
					"",
				);
				return result;
			}),
		);

export const client = new Client({
	url: API_URL,
	exchanges: [
		normalizeErrorMessageExchange,
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
