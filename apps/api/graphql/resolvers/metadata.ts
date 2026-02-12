import { readFile } from "node:fs/promises";
import type { QueryResolvers } from "../generated/types";

export const metadataQueries: QueryResolvers = {
	appMetadata: async () => {
		try {
			const packageJsonPath = new URL(
				"../../../../package.json",
				import.meta.url,
			);
			const packageJsonContent = await readFile(packageJsonPath, "utf-8");
			const packageJson = JSON.parse(packageJsonContent) as {
				version?: string;
			};

			return {
				version: packageJson.version ?? "0.0.0",
			};
		} catch (_error) {
			return {
				version: "0.0.0",
			};
		}
	},
};
