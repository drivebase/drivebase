import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "urql";
import { ThemeProvider } from "@/components/theme-provider";
import { client } from "@/shared/lib/urql";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./styles.css";

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	parseSearch: (search) => {
		const params = new URLSearchParams(search);
		return Object.fromEntries(params.entries());
	},
	stringifySearch: (search: Record<string, unknown>) => {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(search)) {
			if (value !== undefined && value !== null) {
				params.set(key, String(value));
			}
		}
		const str = params.toString();
		return str ? `?${str}` : "";
	},
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<Provider value={client}>
				<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
					<RouterProvider router={router} />
				</ThemeProvider>
			</Provider>
		</StrictMode>,
	);
}
