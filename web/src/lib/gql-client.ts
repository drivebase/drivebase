import { createClient as createSSEClient } from "graphql-sse";
import {
	cacheExchange,
	createClient,
	fetchExchange,
	subscriptionExchange,
} from "urql";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/graphql";

const sseClient = createSSEClient({ url: API_URL });

export const gqlClient = createClient({
	url: API_URL,
	exchanges: [
		cacheExchange,
		fetchExchange,
		subscriptionExchange({
			forwardSubscription: (req) => ({
				subscribe: (sink) => ({
					unsubscribe: sseClient.subscribe(
						req as Parameters<typeof sseClient.subscribe>[0],
						sink,
					),
				}),
			}),
		}),
	],
	fetchOptions: () => {
		const token = localStorage.getItem("token");
		return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
	},
});
