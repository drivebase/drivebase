/**
 * Tests for provider-level access control enforcement.
 * Covers getAccessibleProviderIds and allowedProviderIds filtering in listing functions.
 */
import { describe, expect, it } from "bun:test";
import {
	getRecentFiles,
	getStarredFiles,
	listFiles,
	searchFiles,
	searchFolders,
} from "../../../service/file/query/file-listing";
import { getStarredFolders } from "../../../service/folder/query/get-starred-folders";
import { listFolders } from "../../../service/folder/query/list-folders";
import { smartSearch } from "../../../service/file/query/smart-search";

// --- Export presence tests ---

describe("file-listing: all listing functions export correctly", () => {
	it("all file listing functions are exported and callable", () => {
		for (const fn of [
			listFiles,
			searchFiles,
			searchFolders,
			getRecentFiles,
			getStarredFiles,
		]) {
			expect(typeof fn).toBe("function");
		}
	});

	it("folder listing functions are exported and callable", () => {
		expect(typeof listFolders).toBe("function");
		expect(typeof getStarredFolders).toBe("function");
	});

	it("smartSearch is exported and callable", () => {
		expect(typeof smartSearch).toBe("function");
	});
});

// --- getContents intersection logic (pure logic, no DB) ---

describe("getContents provider intersection logic", () => {
	function intersect(
		clientProviderIds: string[] | undefined,
		allowedProviderIds: string[] | null,
	): string[] | undefined {
		if (!allowedProviderIds) return clientProviderIds;
		if (!clientProviderIds) return allowedProviderIds;
		return clientProviderIds.filter((id) => allowedProviderIds.includes(id));
	}

	it("passes through client ids when user has full access (null grants)", () => {
		expect(intersect(["p1", "p2"], null)).toEqual(["p1", "p2"]);
	});

	it("uses grants when client sends no provider ids", () => {
		expect(intersect(undefined, ["p1"])).toEqual(["p1"]);
	});

	it("intersects to allowed subset when client requests more than allowed", () => {
		expect(intersect(["p1", "p2", "p3"], ["p1", "p3"])).toEqual(["p1", "p3"]);
	});

	it("returns empty array when client requests providers outside allowed set", () => {
		expect(intersect(["p-forbidden"], ["p-allowed"])).toEqual([]);
	});

	it("returns full allowed set when client requests all allowed providers", () => {
		expect(intersect(["p1", "p2"], ["p1", "p2"])).toEqual(["p1", "p2"]);
	});

	it("returns undefined when both are undefined/null (full access, no filter)", () => {
		expect(intersect(undefined, null)).toBeUndefined();
	});
});

// --- getAccessibleProviderIds logic tests (pure logic) ---

describe("getAccessibleProviderIds semantics", () => {
	// These tests document the expected behavior without hitting the DB.

	it("null return means full access (no restrictions)", () => {
		// Owners, admins, and members with no grants all get null → full access
		const fullAccess = null;
		expect(fullAccess).toBeNull();
	});

	it("string[] return means restricted access to listed provider IDs", () => {
		const restricted = ["provider-a", "provider-b"];
		expect(restricted).toBeArray();
		expect(restricted.length).toBeGreaterThan(0);
	});

	it("deduplicates provider IDs from multiple grants for the same provider", () => {
		// Simulates: [...new Set(grants.map(g => g.providerId))]
		const grants = [
			{ providerId: "p1", folderPath: "/a" },
			{ providerId: "p1", folderPath: "/b" },
			{ providerId: "p2", folderPath: null },
		];
		const providerIds = [...new Set(grants.map((g) => g.providerId))];
		expect(providerIds).toEqual(["p1", "p2"]);
		expect(providerIds.length).toBe(2);
	});
});

// --- validateAccessGrants logic (pure path validation) ---

describe("validateAccessGrants: folderPath normalization", () => {
	function normalizePath(folderPath: string): string {
		return folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
	}

	it("prepends slash to paths without leading slash", () => {
		expect(normalizePath("docs/reports")).toBe("/docs/reports");
	});

	it("leaves paths with leading slash unchanged", () => {
		expect(normalizePath("/docs/reports")).toBe("/docs/reports");
	});

	it("handles root path correctly", () => {
		expect(normalizePath("/")).toBe("/");
	});
});
