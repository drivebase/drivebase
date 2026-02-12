import { Client, cacheExchange, fetchExchange } from "urql";

const API_URL =
	import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:4000/graphql";

export const client = new Client({
	url: API_URL,
	exchanges: [cacheExchange, fetchExchange],
	fetchOptions: () => {
		const token = localStorage.getItem("token");
		return {
			headers: {
				authorization: token ? `Bearer ${token}` : "",
			},
		};
	},
});
