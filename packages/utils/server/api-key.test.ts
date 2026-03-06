import { describe, expect, it } from "bun:test";
import { generateApiKey, hashApiKey, isApiKeyToken } from "./api-key";

describe("generateApiKey", () => {
	it("produces a key with drv_ prefix", () => {
		const { fullKey } = generateApiKey();
		expect(fullKey.startsWith("drv_")).toBe(true);
	});

	it("fullKey is 44 chars (drv_ + 40 hex)", () => {
		const { fullKey } = generateApiKey();
		expect(fullKey.length).toBe(44);
	});

	it("keyPrefix is first 12 chars of fullKey", () => {
		const { fullKey, keyPrefix } = generateApiKey();
		expect(keyPrefix).toBe(fullKey.slice(0, 12));
	});

	it("keyHash is a 64-char hex string", () => {
		const { keyHash } = generateApiKey();
		expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("produces unique keys each call", () => {
		const a = generateApiKey();
		const b = generateApiKey();
		expect(a.fullKey).not.toBe(b.fullKey);
		expect(a.keyHash).not.toBe(b.keyHash);
	});
});

describe("hashApiKey", () => {
	it("is deterministic", () => {
		const key = "drv_abc123";
		expect(hashApiKey(key)).toBe(hashApiKey(key));
	});

	it("produces different hashes for different keys", () => {
		expect(hashApiKey("drv_aaa")).not.toBe(hashApiKey("drv_bbb"));
	});
});

describe("isApiKeyToken", () => {
	it("returns true for drv_ prefixed tokens", () => {
		expect(isApiKeyToken("drv_abc")).toBe(true);
	});

	it("returns false for JWT tokens", () => {
		expect(isApiKeyToken("eyJhbGciOiJIUzI1NiJ9.payload.sig")).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isApiKeyToken("")).toBe(false);
	});
});
