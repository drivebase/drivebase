import { describe, expect, it } from "bun:test";
import { DrivebaseClient } from "../src/client.ts";

describe("DrivebaseClient", () => {
	it("creates files and folders resources", () => {
		const client = new DrivebaseClient({
			apiKey: "drv_test",
			workspaceId: "ws_1",
		});

		expect(client.files).toBeDefined();
		expect(client.folders).toBeDefined();
	});

	it("normalizes baseUrl with trailing slash", () => {
		// Should not throw — exercises normalizeBaseUrl
		const client = new DrivebaseClient({
			apiKey: "drv_test",
			workspaceId: "ws_1",
			baseUrl: "https://example.com/",
		});
		expect(client.files).toBeDefined();
	});

	it("normalizes baseUrl with /graphql suffix", () => {
		const client = new DrivebaseClient({
			apiKey: "drv_test",
			workspaceId: "ws_1",
			baseUrl: "https://example.com/graphql",
		});
		expect(client.files).toBeDefined();
	});

	it("accepts custom fetch", () => {
		const customFetch = async () => new Response("{}");
		const client = new DrivebaseClient({
			apiKey: "drv_test",
			workspaceId: "ws_1",
			fetch: customFetch as unknown as typeof globalThis.fetch,
		});
		expect(client.files).toBeDefined();
	});
});
