import { readFile } from "node:fs/promises";
import type { MutationResolvers, QueryResolvers } from "../generated/types";
import { requireRole } from "./auth-helpers";

const UPDATER_URL = process.env.UPDATER_URL || "http://updater:4500";
const UPDATER_SECRET = process.env.UPDATER_SECRET;

function updaterHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (UPDATER_SECRET) {
		headers.Authorization = `Bearer ${UPDATER_SECRET}`;
	}
	return headers;
}

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

	updateStatus: async (_parent, _args, context) => {
		requireRole(context, ["admin", "owner"]);

		try {
			const response = await fetch(`${UPDATER_URL}/status`, {
				headers: updaterHeaders(),
			});

			if (!response.ok) {
				return {
					status: "error",
					message: `Updater returned ${response.status}`,
				};
			}

			return (await response.json()) as {
				status: string;
				message: string | null;
				currentVersion: string | null;
				targetVersion: string | null;
			};
		} catch (_error) {
			return {
				status: "error",
				message: "Updater sidecar is not reachable",
			};
		}
	},
};

export const metadataMutations: MutationResolvers = {
	triggerAppUpdate: async (_parent, args, context) => {
		requireRole(context, ["admin", "owner"]);

		try {
			const body: Record<string, string> = {};
			if (args.version) {
				body.targetVersion = args.version;
			}

			const response = await fetch(`${UPDATER_URL}/update`, {
				method: "POST",
				headers: updaterHeaders(),
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const data = (await response.json()) as {
					error?: string;
					status?: string;
					message?: string;
				};
				return {
					status: data.status ?? "error",
					message: data.error ?? data.message ?? `HTTP ${response.status}`,
				};
			}

			return (await response.json()) as {
				status: string;
				message: string | null;
				currentVersion: string | null;
				targetVersion: string | null;
			};
		} catch (_error) {
			return {
				status: "error",
				message: "Updater sidecar is not reachable",
			};
		}
	},
};
