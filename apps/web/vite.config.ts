import { fileURLToPath, URL } from "node:url";
import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// API server target for the dev proxy (mirrors Caddy's reverse_proxy in prod).
const API_TARGET = process.env.VITE_PUBLIC_BASE_URL || "http://localhost:4000";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		port: 3000,
		proxy: {
			"/graphql": { target: API_TARGET },
			"/api": { target: API_TARGET },
			"/webhook": { target: API_TARGET },
			"/dav": { target: API_TARGET },
		},
	},
	plugins: [
		mode !== "production" && devtools(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		viteReact({
			babel: {
				plugins: ["macros"],
			},
		}),
		lingui(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	optimizeDeps: {
		include: ["@lingui/core", "@lingui/react"],
	},
}));
