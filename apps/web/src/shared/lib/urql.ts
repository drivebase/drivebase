import { createClient as createSSEClient } from "graphql-sse";
import {
	Client,
	cacheExchange,
	fetchExchange,
	subscriptionExchange,
} from "urql";

const API_URL =
	import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:4000/graphql";

const sseClient = createSSEClient({
	url: API_URL,
	headers: () => {
		const token = localStorage.getItem("token");
		return {
			authorization: token ? `Bearer ${token}` : "",
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
		return {
			headers: {
				authorization: token ? `Bearer ${token}` : "",
			},
		};
	},
});
