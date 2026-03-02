import { HttpClient } from "./http.ts";
import { FilesResource } from "./resources/files.ts";
import { FoldersResource } from "./resources/folders.ts";
import type { DrivebaseClientOptions } from "./types.ts";

/**
 * Main entry point for the Drivebase SDK.
 *
 * @example
 * ```ts
 * const db = new DrivebaseClient({
 *   apiKey: "drv_...",
 *   workspaceId: "ws_123",
 *   baseUrl: "https://my-instance.com",
 * });
 *
 * const files = await db.files.list({ limit: 20 });
 * ```
 */
export class DrivebaseClient {
	readonly files: FilesResource;
	readonly folders: FoldersResource;

	constructor(options: DrivebaseClientOptions) {
		const baseUrl = normalizeBaseUrl(
			options.baseUrl ?? "http://localhost:4000",
		);
		const graphqlUrl = `${baseUrl}/graphql`;

		const http = new HttpClient({
			graphqlUrl,
			restBaseUrl: baseUrl,
			apiKey: options.apiKey,
			workspaceId: options.workspaceId,
			fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
		});

		this.files = new FilesResource(http);
		this.folders = new FoldersResource(http);
	}
}

/**
 * Normalize the base URL: strip trailing slash and /graphql suffix.
 */
function normalizeBaseUrl(url: string): string {
	let normalized = url.replace(/\/+$/, "");
	if (normalized.endsWith("/graphql")) {
		normalized = normalized.slice(0, -"/graphql".length);
	}
	return normalized;
}
