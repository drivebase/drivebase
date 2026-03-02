import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { HttpClient } from "../src/http.ts";
import { FilesResource } from "../src/resources/files.ts";
import { FoldersResource } from "../src/resources/folders.ts";

function createMockHttp(responses: Record<string, unknown> = {}) {
	const graphqlFn = mock(
		async (_query: string, variables?: Record<string, unknown>) => {
			// Return the first matching response key found in the query
			for (const [key, value] of Object.entries(responses)) {
				if (_query.includes(key)) {
					return value;
				}
			}
			return {};
		},
	);

	const restFn = mock(async () => ({
		ok: true,
		status: 200,
		body: new ReadableStream(),
		text: async () => "",
		json: async () => ({}),
		headers: new Headers(),
	}));

	return {
		graphql: graphqlFn,
		rest: restFn,
	} as unknown as HttpClient;
}

describe("FilesResource", () => {
	let http: ReturnType<typeof createMockHttp>;
	let files: FilesResource;

	beforeEach(() => {
		http = createMockHttp({
			GetFile: { file: { id: "f1", name: "doc.pdf" } },
			ListFiles: {
				files: {
					files: [{ id: "f1" }, { id: "f2" }],
					total: 2,
					hasMore: false,
				},
			},
			GetContents: {
				contents: {
					files: [{ id: "f1" }],
					folders: [{ id: "d1" }],
					folder: null,
				},
			},
			SearchFiles: { searchFiles: [{ id: "f1", name: "report.pdf" }] },
			SmartSearch: {
				smartSearch: [{ file: { id: "f1" }, headline: "match", rank: 0.9 }],
			},
			RecentFiles: { recentFiles: [{ id: "f1" }] },
			StarredFiles: { starredFiles: [{ id: "f1" }] },
			RenameFile: { renameFile: { id: "f1", name: "renamed.pdf" } },
			MoveFile: { moveFile: { id: "f1", folderId: "d2" } },
			DeleteFile: { deleteFile: true },
			StarFile: { starFile: { id: "f1", starred: true } },
			UnstarFile: { unstarFile: { id: "f1", starred: false } },
			RequestDownload: {
				requestDownload: {
					fileId: "f1",
					downloadUrl: "https://cdn.example.com/file",
					useDirectDownload: true,
				},
			},
		});
		files = new FilesResource(http as unknown as HttpClient);
	});

	it("get() fetches a file by ID", async () => {
		const file = await files.get("f1");
		expect(file.id).toBe("f1");
		expect(file.name).toBe("doc.pdf");
		expect(http.graphql).toHaveBeenCalledTimes(1);
	});

	it("list() fetches files with pagination", async () => {
		const result = await files.list({ folderId: "d1", limit: 20 });
		expect(result.files).toHaveLength(2);
		expect(result.total).toBe(2);
		expect(result.hasMore).toBe(false);
	});

	it("contents() fetches files and folders", async () => {
		const result = await files.contents({ folderId: "d1" });
		expect(result.files).toHaveLength(1);
		expect(result.folders).toHaveLength(1);
	});

	it("search() searches files by name", async () => {
		const result = await files.search("report");
		expect(result).toHaveLength(1);
		expect(result[0]!.name).toBe("report.pdf");
	});

	it("smartSearch() returns results with headlines", async () => {
		const result = await files.smartSearch("revenue");
		expect(result).toHaveLength(1);
		expect(result[0]!.headline).toBe("match");
		expect(result[0]!.rank).toBe(0.9);
	});

	it("recent() fetches recent files", async () => {
		const result = await files.recent({ limit: 10 });
		expect(result).toHaveLength(1);
	});

	it("starred() fetches starred files", async () => {
		const result = await files.starred();
		expect(result).toHaveLength(1);
	});

	it("rename() renames a file", async () => {
		const file = await files.rename("f1", "renamed.pdf");
		expect(file.name).toBe("renamed.pdf");
	});

	it("move() moves a file to another folder", async () => {
		const file = await files.move("f1", "d2");
		expect(file.folderId).toBe("d2");
	});

	it("delete() soft-deletes a file", async () => {
		const result = await files.delete("f1");
		expect(result).toBe(true);
	});

	it("star() stars a file", async () => {
		const file = await files.star("f1");
		expect(file.starred).toBe(true);
	});

	it("unstar() unstars a file", async () => {
		const file = await files.unstar("f1");
		expect(file.starred).toBe(false);
	});

	it("download() returns url and stream for direct download", async () => {
		const result = await files.download("f1");
		expect(result.url).toBe("https://cdn.example.com/file");
		expect(typeof result.stream).toBe("function");
	});
});

describe("FoldersResource", () => {
	let http: ReturnType<typeof createMockHttp>;
	let folders: FoldersResource;

	beforeEach(() => {
		http = createMockHttp({
			GetFolder: { folder: { id: "d1", name: "Reports" } },
			ListFolders: {
				folders: [{ id: "d1" }, { id: "d2" }],
			},
			StarredFolders: { starredFolders: [{ id: "d1" }] },
			CreateFolder: {
				createFolder: { id: "d3", name: "New Folder" },
			},
			RenameFolder: {
				renameFolder: { id: "d1", name: "Renamed" },
			},
			MoveFolder: {
				moveFolder: { id: "d1", parentId: "d2" },
			},
			DeleteFolder: { deleteFolder: true },
			StarFolder: { starFolder: { id: "d1", starred: true } },
			UnstarFolder: { unstarFolder: { id: "d1", starred: false } },
		});
		folders = new FoldersResource(http as unknown as HttpClient);
	});

	it("get() fetches a folder by ID", async () => {
		const folder = await folders.get("d1");
		expect(folder?.id).toBe("d1");
		expect(folder?.name).toBe("Reports");
	});

	it("list() fetches folders by parent", async () => {
		const result = await folders.list({ parentId: "d1" });
		expect(result).toHaveLength(2);
	});

	it("starred() fetches starred folders", async () => {
		const result = await folders.starred();
		expect(result).toHaveLength(1);
	});

	it("create() creates a new folder", async () => {
		const folder = await folders.create({
			name: "New Folder",
			providerId: "p1",
		});
		expect(folder.name).toBe("New Folder");
	});

	it("rename() renames a folder", async () => {
		const folder = await folders.rename("d1", "Renamed");
		expect(folder.name).toBe("Renamed");
	});

	it("move() moves a folder", async () => {
		const folder = await folders.move("d1", "d2");
		expect(folder.parentId).toBe("d2");
	});

	it("delete() soft-deletes a folder", async () => {
		const result = await folders.delete("d1");
		expect(result).toBe(true);
	});

	it("star() stars a folder", async () => {
		const folder = await folders.star("d1");
		expect(folder.starred).toBe(true);
	});

	it("unstar() unstars a folder", async () => {
		const folder = await folders.unstar("d1");
		expect(folder.starred).toBe(false);
	});
});
