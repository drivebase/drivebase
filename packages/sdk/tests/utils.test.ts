import { describe, expect, it } from "bun:test";
import { sliceIntoChunks } from "../src/utils/chunk.ts";
import { withRetry } from "../src/utils/retry.ts";

describe("sliceIntoChunks", () => {
	it("returns a single chunk for data smaller than chunkSize", () => {
		const data = new Blob([new Uint8Array(100)]);
		const chunks = sliceIntoChunks(data, 1024);
		expect(chunks).toHaveLength(1);
		expect(chunks[0]!.size).toBe(100);
	});

	it("splits data into correct number of chunks", () => {
		const data = new Blob([new Uint8Array(1000)]);
		const chunks = sliceIntoChunks(data, 300);
		expect(chunks).toHaveLength(4); // 300 + 300 + 300 + 100
		expect(chunks[0]!.size).toBe(300);
		expect(chunks[1]!.size).toBe(300);
		expect(chunks[2]!.size).toBe(300);
		expect(chunks[3]!.size).toBe(100);
	});

	it("handles exact multiples of chunkSize", () => {
		const data = new Blob([new Uint8Array(600)]);
		const chunks = sliceIntoChunks(data, 300);
		expect(chunks).toHaveLength(2);
		expect(chunks[0]!.size).toBe(300);
		expect(chunks[1]!.size).toBe(300);
	});

	it("converts Uint8Array to Blob before slicing", () => {
		const data = new Uint8Array(500);
		const chunks = sliceIntoChunks(data, 200);
		expect(chunks).toHaveLength(3);
		expect(chunks[0]!.size).toBe(200);
		expect(chunks[1]!.size).toBe(200);
		expect(chunks[2]!.size).toBe(100);
	});

	it("converts ArrayBuffer to Blob before slicing", () => {
		const data = new ArrayBuffer(400);
		const chunks = sliceIntoChunks(data, 150);
		expect(chunks).toHaveLength(3);
	});
});

describe("withRetry", () => {
	it("returns result on first success", async () => {
		let calls = 0;
		const result = await withRetry(async () => {
			calls++;
			return "ok";
		});
		expect(result).toBe("ok");
		expect(calls).toBe(1);
	});

	it("retries on failure and succeeds", async () => {
		let calls = 0;
		const result = await withRetry(
			async () => {
				calls++;
				if (calls < 3) throw new Error("fail");
				return "recovered";
			},
			{ maxRetries: 3, baseDelayMs: 1 },
		);
		expect(result).toBe("recovered");
		expect(calls).toBe(3);
	});

	it("throws after exhausting retries", async () => {
		let calls = 0;
		await expect(
			withRetry(
				async () => {
					calls++;
					throw new Error("always fails");
				},
				{ maxRetries: 2, baseDelayMs: 1 },
			),
		).rejects.toThrow("always fails");
		expect(calls).toBe(3); // initial + 2 retries
	});

	it("respects shouldRetry predicate", async () => {
		let calls = 0;
		await expect(
			withRetry(
				async () => {
					calls++;
					throw new Error("no-retry");
				},
				{
					maxRetries: 5,
					baseDelayMs: 1,
					shouldRetry: () => false,
				},
			),
		).rejects.toThrow("no-retry");
		expect(calls).toBe(1);
	});
});
