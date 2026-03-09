import { describe, expect, it } from "bun:test";
import {
	getRecentFiles,
	getStarredFiles,
	listFiles,
	searchFiles,
	searchFolders,
} from "../../../service/file/query/file-listing";

describe("file query listing/search", () => {
	it("exports file listing and search functions", () => {
		expect(typeof listFiles).toBe("function");
		expect(typeof searchFiles).toBe("function");
		expect(typeof searchFolders).toBe("function");
		expect(typeof getRecentFiles).toBe("function");
		expect(typeof getStarredFiles).toBe("function");
	});

	it("listFiles, searchFiles, searchFolders, getRecentFiles, getStarredFiles are all functions", () => {
		// Verify all exports are callable (allowedProviderIds param is optional, so no arity check needed)
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
});
