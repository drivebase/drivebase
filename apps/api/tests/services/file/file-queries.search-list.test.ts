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
});
