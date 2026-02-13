import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [
		mode !== "production" && devtools(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		viteReact(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) return;
					if (
						id.includes("/react/") ||
						id.includes("/react-dom/") ||
						id.includes("/scheduler/")
					)
						return "vendor-react";
					if (
						id.includes("@tanstack/react-router") ||
						id.includes("@tanstack/router") ||
						id.includes("@tanstack/history")
					)
						return "vendor-router";
					if (
						id.includes("/urql/") ||
						id.includes("/graphql/") ||
						id.includes("/wonka/") ||
						id.includes("@urql/")
					)
						return "vendor-gql";
					if (id.includes("/lucide-react/")) return "vendor-icons";
					if (id.includes("/date-fns/")) return "vendor-dates";
					if (
						id.includes("/radix-ui/") ||
						id.includes("@radix-ui/") ||
						id.includes("@base-ui/") ||
						id.includes("@base-ui-components/")
					)
						return "vendor-radix";
					if (id.includes("/zod/")) return "vendor-zod";
					return "vendor";
				},
			},
		},
	},
}));
