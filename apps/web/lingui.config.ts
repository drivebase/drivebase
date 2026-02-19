import { defineConfig } from "@lingui/cli";

export default defineConfig({
	locales: ["en", "es", "ar"],
	sourceLocale: "en",
	catalogs: [
		{
			path: "src/locales/{locale}/messages",
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/gql/**/*", "**/node_modules/**"],
		},
	],
	compileNamespace: "ts",
});
