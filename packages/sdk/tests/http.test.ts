import { describe, expect, it, mock } from "bun:test";
import { ApiError, AuthenticationError, NetworkError } from "../src/errors.ts";
import { HttpClient } from "../src/http.ts";

interface CapturedRequest {
	url: string;
	options: RequestInit;
}

function createMockFetch(response: {
	status?: number;
	body?: unknown;
	ok?: boolean;
}) {
	let captured: CapturedRequest | undefined;

	const fetchFn = mock(async (url: string, options: RequestInit) => {
		captured = { url, options };
		return {
			status: response.status ?? 200,
			ok: response.ok ?? true,
			json: async () => response.body,
			text: async () => JSON.stringify(response.body),
			headers: new Headers(),
			body: null,
		};
	});

	return {
		fetchFn: fetchFn as unknown as typeof globalThis.fetch,
		get captured() {
			return captured;
		},
	};
}

function createClient(fetchFn: typeof globalThis.fetch) {
	return new HttpClient({
		graphqlUrl: "https://api.test.com/graphql",
		restBaseUrl: "https://api.test.com",
		apiKey: "drv_test_key",
		workspaceId: "ws_123",
		fetch: fetchFn,
	});
}

describe("HttpClient.graphql", () => {
	it("sends correct headers and body", async () => {
		const m = createMockFetch({ body: { data: { file: { id: "f1" } } } });
		const client = createClient(m.fetchFn);

		await client.graphql("query { file(id: $id) { id } }", { id: "f1" });

		// Access via getter (not via destructured copy) to get the updated value
		expect(m.captured).toBeDefined();
		expect(m.captured!.url).toBe("https://api.test.com/graphql");
		expect(m.captured!.options.method).toBe("POST");

		const headers = m.captured!.options.headers as Record<string, string>;
		expect(headers["Content-Type"]).toBe("application/json");
		expect(headers["Authorization"]).toBe("Bearer drv_test_key");
		expect(headers["x-workspace-id"]).toBe("ws_123");

		const body = JSON.parse(m.captured!.options.body as string);
		expect(body.query).toContain("file");
		expect(body.variables).toEqual({ id: "f1" });
	});

	it("returns data from successful response", async () => {
		const { fetchFn } = createMockFetch({
			body: { data: { files: [{ id: "f1" }, { id: "f2" }] } },
		});
		// fetchFn is safe to destructure — we don't need captured here
		const client = createClient(fetchFn);

		const result = await client.graphql<{ files: Array<{ id: string }> }>(
			"query { files { id } }",
		);
		expect(result.files).toHaveLength(2);
		expect(result.files[0]!.id).toBe("f1");
	});

	it("throws ApiError on GraphQL errors", async () => {
		const { fetchFn } = createMockFetch({
			body: { errors: [{ message: "File not found" }] },
		});
		const client = createClient(fetchFn);

		try {
			await client.graphql("query { file(id: $id) { id } }", { id: "missing" });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).message).toBe("File not found");
			expect((error as ApiError).errors).toHaveLength(1);
		}
	});

	it("throws ApiError when data is missing", async () => {
		const { fetchFn } = createMockFetch({ body: {} });
		const client = createClient(fetchFn);

		try {
			await client.graphql("query { file { id } }");
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).message).toBe("No data returned from API");
		}
	});

	it("throws AuthenticationError on 401", async () => {
		const { fetchFn } = createMockFetch({ status: 401, body: {} });
		const client = createClient(fetchFn);

		await expect(client.graphql("query { me { id } }")).rejects.toBeInstanceOf(
			AuthenticationError,
		);
	});

	it("throws NetworkError when fetch throws", async () => {
		const failFetch = mock(async () => {
			throw new TypeError("fetch failed");
		}) as unknown as typeof globalThis.fetch;
		const client = createClient(failFetch);

		try {
			await client.graphql("query { me { id } }");
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(NetworkError);
			expect((error as NetworkError).cause).toBeInstanceOf(TypeError);
		}
	});
});

describe("HttpClient.rest", () => {
	it("sends auth headers and query params", async () => {
		const m = createMockFetch({ body: { success: true } });
		const client = createClient(m.fetchFn);

		await client.rest("GET", "/api/download/proxy", {
			query: { fileId: "f1" },
		});

		expect(m.captured).toBeDefined();
		expect(m.captured!.url).toContain("/api/download/proxy");
		expect(m.captured!.url).toContain("fileId=f1");
		expect(m.captured!.options.method).toBe("GET");

		const headers = m.captured!.options.headers as Record<string, string>;
		expect(headers["Authorization"]).toBe("Bearer drv_test_key");
		expect(headers["x-workspace-id"]).toBe("ws_123");
	});

	it("throws AuthenticationError on 401", async () => {
		const { fetchFn } = createMockFetch({ status: 401, ok: false, body: {} });
		const client = createClient(fetchFn);

		await expect(
			client.rest("POST", "/api/upload/proxy"),
		).rejects.toBeInstanceOf(AuthenticationError);
	});

	it("throws NetworkError on fetch failure", async () => {
		const failFetch = mock(async () => {
			throw new Error("DNS resolution failed");
		}) as unknown as typeof globalThis.fetch;
		const client = createClient(failFetch);

		await expect(
			client.rest("GET", "/api/download/proxy"),
		).rejects.toBeInstanceOf(NetworkError);
	});
});
