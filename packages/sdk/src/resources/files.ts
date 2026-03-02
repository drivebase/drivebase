import type { HttpClient } from "../http.ts";
import {
	DELETE_FILE,
	MOVE_FILE,
	RENAME_FILE,
	REQUEST_DOWNLOAD,
	STAR_FILE,
	UNSTAR_FILE,
} from "../operations/file-mutations.ts";
import {
	GET_CONTENTS,
	GET_FILE,
	LIST_FILES,
	RECENT_FILES,
	SEARCH_FILES,
	SMART_SEARCH,
	STARRED_FILES,
} from "../operations/file-queries.ts";
import type {
	ContentsParams,
	DownloadResponse,
	DownloadResult,
	File,
	FileConnection,
	ListFilesParams,
	PathContents,
	ProgressCallback,
	RecentFilesParams,
	SearchParams,
	SmartSearchResult,
	UploadOptions,
} from "../types.ts";
import { UploadManager } from "./upload.ts";

export class FilesResource {
	private readonly uploadManager: UploadManager;

	constructor(private readonly http: HttpClient) {
		this.uploadManager = new UploadManager(http);
	}

	/** Get a file by ID */
	async get(id: string): Promise<File> {
		const data = await this.http.graphql<{ file: File }>(GET_FILE, { id });
		return data.file;
	}

	/** List files in a folder with pagination */
	async list(params: ListFilesParams = {}): Promise<FileConnection> {
		const data = await this.http.graphql<{ files: FileConnection }>(
			LIST_FILES,
			{
				folderId: params.folderId,
				limit: params.limit,
				offset: params.offset,
			},
		);
		return data.files;
	}

	/** Get files and folders at a location */
	async contents(params: ContentsParams = {}): Promise<PathContents> {
		const data = await this.http.graphql<{ contents: PathContents }>(
			GET_CONTENTS,
			{
				folderId: params.folderId,
				providerIds: params.providerIds,
			},
		);
		return data.contents;
	}

	/** Search files by name */
	async search(query: string, limit?: number): Promise<File[]> {
		const data = await this.http.graphql<{ searchFiles: File[] }>(
			SEARCH_FILES,
			{ query, limit },
		);
		return data.searchFiles;
	}

	/** Full-text search on extracted file contents */
	async smartSearch(
		query: string,
		limit?: number,
	): Promise<SmartSearchResult[]> {
		const data = await this.http.graphql<{
			smartSearch: SmartSearchResult[];
		}>(SMART_SEARCH, { query, limit });
		return data.smartSearch;
	}

	/** Get recently created/updated files */
	async recent(params: RecentFilesParams = {}): Promise<File[]> {
		const data = await this.http.graphql<{ recentFiles: File[] }>(
			RECENT_FILES,
			{ limit: params.limit },
		);
		return data.recentFiles;
	}

	/** Get starred files */
	async starred(): Promise<File[]> {
		const data = await this.http.graphql<{ starredFiles: File[] }>(
			STARRED_FILES,
		);
		return data.starredFiles;
	}

	/**
	 * Upload a file. Automatically uses chunked upload for files >50MB.
	 * Returns the created file record.
	 */
	async upload(
		options: UploadOptions,
		onProgress?: ProgressCallback,
	): Promise<File> {
		return this.uploadManager.upload(options, onProgress);
	}

	/**
	 * Request a download for a file.
	 * Returns an object with a `url` and a lazy `stream()` method.
	 */
	async download(id: string): Promise<DownloadResult> {
		const data = await this.http.graphql<{
			requestDownload: DownloadResponse;
		}>(REQUEST_DOWNLOAD, { id });

		const { downloadUrl, useDirectDownload } = data.requestDownload;
		const http = this.http;

		if (useDirectDownload && downloadUrl) {
			return {
				url: downloadUrl,
				stream: async () => {
					const response = await fetch(downloadUrl);
					if (!response.ok || !response.body) {
						throw new Error(`Download failed: ${response.status}`);
					}
					return response.body;
				},
			};
		}

		// Proxy download
		const proxyUrl = `/api/download/proxy?fileId=${encodeURIComponent(id)}`;
		return {
			url: proxyUrl,
			stream: async () => {
				const response = await http.rest("GET", "/api/download/proxy", {
					query: { fileId: id },
				});
				if (!response.ok || !response.body) {
					throw new Error(`Download failed: ${response.status}`);
				}
				return response.body;
			},
		};
	}

	/** Rename a file */
	async rename(id: string, name: string): Promise<File> {
		const data = await this.http.graphql<{ renameFile: File }>(RENAME_FILE, {
			id,
			name,
		});
		return data.renameFile;
	}

	/** Move a file to a different folder (pass null/undefined to move to root) */
	async move(id: string, folderId?: string | null): Promise<File> {
		const data = await this.http.graphql<{ moveFile: File }>(MOVE_FILE, {
			id,
			folderId: folderId ?? null,
		});
		return data.moveFile;
	}

	/** Delete a file (soft delete) */
	async delete(id: string): Promise<boolean> {
		const data = await this.http.graphql<{ deleteFile: boolean }>(DELETE_FILE, {
			id,
		});
		return data.deleteFile;
	}

	/** Star a file */
	async star(id: string): Promise<File> {
		const data = await this.http.graphql<{ starFile: File }>(STAR_FILE, {
			id,
		});
		return data.starFile;
	}

	/** Unstar a file */
	async unstar(id: string): Promise<File> {
		const data = await this.http.graphql<{ unstarFile: File }>(UNSTAR_FILE, {
			id,
		});
		return data.unstarFile;
	}
}
