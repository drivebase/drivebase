import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-json";

export default defineConfig({
	locales: ["en", "es"],
	sourceLocale: "en",
	catalogs: [
		{
			path: "src/locales/{locale}/messages",
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/gql/**/*", "**/node_modules/**"],
		},
	],
	format: formatter({ style: "lingui" }),
	compileNamespace: "ts",
});
