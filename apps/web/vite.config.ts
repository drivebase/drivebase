import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { lingui } from "@lingui/vite-plugin";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
