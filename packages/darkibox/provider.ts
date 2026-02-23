import type {
	CopyOptions,
	CreateFolderOptions,
	DeleteOptions,
	DownloadOptions,
	DownloadResponse,
	FileMetadata,
	FolderMetadata,
	IStorageProvider,
	ListOptions,
	ListResult,
	MoveOptions,
	ProviderConfig,
	ProviderQuota,
	UploadOptions,
	UploadResponse,
} from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import type { DarkiboxConfig } from "./schema";
import { DarkiboxConfigSchema } from "./schema";

const DARKIBOX_API_BASE = "https://darkibox.com/api";

/** Root folder sentinel — fld_id 0 is used by Darkibox for the root */
const ROOT_FOLDER_REMOTE_ID = "fld_0";

// ---------------------------------------------------------------------------
// Darkibox API response shapes
// ---------------------------------------------------------------------------

interface DarkiboxApiResponse<T> {
	msg: string;
	server_time?: string;
	status: number;
	result: T;
}

interface DarkiboxAccountInfo {
	login: string;
	email: string;
	storage_used: number;
	storage_left: number;
	storage_total?: number;
}

interface DarkiboxFileInfo {
	file_code: string;
	file_title: string;
	file_size: number;
	views?: number;
	created: string;
	thumbnail?: string;
}

interface DarkiboxFolderEntry {
	fld_id: number;
	name: string;
	fld_descr?: string;
	subfolders?: DarkiboxFolderEntry[];
	files?: DarkiboxFileInfo[];
}

interface DarkiboxDirectLinkVersion {
	url: string;
	version: string;
	size: number;
}

interface DarkiboxDirectLink {
	versions: DarkiboxDirectLinkVersion[];
}

interface DarkiboxUploadFile {
	code: string;
	name?: string;
	status: string;
}

interface DarkiboxUploadResult {
	files: DarkiboxUploadFile[];
}

interface DarkiboxFolderCreateResult {
	fld_id: number;
}

interface DarkiboxFileListResult {
	results: number;
	results_total: number;
	pages: number;
	page: number;
	files: DarkiboxFileInfo[];
}

interface DarkiboxFileCloneResult {
	file_code: string;
	url: string;
}

/** Stored while awaiting the proxied uploadFile() call */
interface PendingUpload {
	serverUrl: string;
	name: string;
	parentId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Folder remoteIds are prefixed with "fld_" to distinguish them from file
 * codes (alphanumeric strings). Root = "fld_0".
 */
function isFolderRemoteId(remoteId: string): boolean {
	return remoteId.startsWith("fld_");
}

/** Strip the "fld_" prefix to get the raw numeric folder ID string. */
function getFolderId(remoteId: string): string {
	return remoteId.startsWith("fld_") ? remoteId.slice(4) : remoteId;
}

function makeFolderRemoteId(id: number | string): string {
	return `fld_${id}`;
}

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}
	return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Darkibox storage provider.
 *
 * Upload flow  : proxy (get server URL in requestUpload, POST multipart in uploadFile)
 * Download flow: direct URL via file/direct_link, fallback to proxy stream
 * remoteId     : file code for files (e.g. "abc123"), "fld_<id>" for folders
 */
export class DarkiboxProvider implements IStorageProvider {
	private config: DarkiboxConfig | null = null;
	/** Keyed by the temp upload ID returned from requestUpload */
	private pendingUploads = new Map<string, PendingUpload>();

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = DarkiboxConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("darkibox", "Invalid Darkibox configuration", {
				errors: parsed.error.errors,
			});
		}
		this.config = parsed.data;
	}

	private ensureConfig(): DarkiboxConfig {
		if (!this.config) {
			throw new ProviderError("darkibox", "Provider not initialized");
		}
		return this.config;
	}

	/** Thin wrapper around the Darkibox REST API (GET-based endpoints). */
	private async apiGet<T>(
		endpoint: string,
		params: Record<string, string> = {},
	): Promise<T> {
		const config = this.ensureConfig();
		const url = new URL(`${DARKIBOX_API_BASE}/${endpoint}`);
		url.searchParams.set("key", config.apiKey);
		for (const [k, v] of Object.entries(params)) {
			url.searchParams.set(k, v);
		}

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new ProviderError(
				"darkibox",
				`Darkibox API error: ${response.status} ${response.statusText}`,
				{ endpoint, status: response.status },
			);
		}

		const data = (await response.json()) as DarkiboxApiResponse<T>;
		if (data.status !== 200) {
			throw new ProviderError(
				"darkibox",
				`Darkibox API returned error: ${data.msg}`,
				{ endpoint, apiStatus: data.status },
			);
		}
		return data.result;
	}

	// -------------------------------------------------------------------------
	// Core provider methods
	// -------------------------------------------------------------------------

	async testConnection(): Promise<boolean> {
		try {
			await this.apiGet<DarkiboxAccountInfo>("account/info");
			return true;
		} catch {
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		const info = await this.apiGet<DarkiboxAccountInfo>("account/info");
		const used = info.storage_used;
		const available = info.storage_left;
		const total = info.storage_total ?? used + available;
		return { used, available, total };
	}

	/**
	 * Fetch the upload server URL and cache the upload options so uploadFile()
	 * can construct the correct multipart POST.
	 */
	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const serverUrl = await this.apiGet<string>("upload/server");

		const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		this.pendingUploads.set(tempId, {
			serverUrl,
			name: options.name,
			parentId: options.parentId,
		});

		return {
			fileId: tempId,
			uploadUrl: undefined,
			uploadFields: undefined,
			useDirectUpload: false,
		};
	}

	/**
	 * Upload the file via multipart POST to the server URL obtained in
	 * requestUpload(). Returns the permanent file_code as the new remoteId.
	 */
	async uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<string | undefined> {
		const config = this.ensureConfig();

		const pending = this.pendingUploads.get(remoteId);
		if (!pending) {
			throw new ProviderError("darkibox", "Upload session not found", {
				remoteId,
			});
		}
		this.pendingUploads.delete(remoteId);

		const buf = Buffer.isBuffer(data) ? data : await streamToBuffer(data);

		const formData = new FormData();
		formData.append("key", config.apiKey);
		if (pending.parentId && pending.parentId !== ROOT_FOLDER_REMOTE_ID) {
			formData.append("fld_id", getFolderId(pending.parentId));
		}
		formData.append("file_title", pending.name);
		formData.append("file", new Blob([new Uint8Array(buf)]), pending.name);

		const response = await fetch(pending.serverUrl, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new ProviderError(
				"darkibox",
				`Upload to server failed: ${response.status}`,
			);
		}

		const result = (await response.json()) as DarkiboxUploadResult;
		const file = result.files[0];
		if (!file || file.status !== "success") {
			throw new ProviderError(
				"darkibox",
				`Upload failed: ${file?.status ?? "no file in response"}`,
			);
		}

		// Return the permanent file_code so the DB record is updated
		return file.code;
	}

	/**
	 * Get a direct download URL via file/direct_link.
	 * Falls back to proxy (useDirectDownload: false) if no URL is available.
	 */
	async requestDownload(options: DownloadOptions): Promise<DownloadResponse> {
		try {
			const data = await this.apiGet<DarkiboxDirectLink>("file/direct_link", {
				file_code: options.remoteId,
				q: "o",
			});

			const original =
				data.versions.find((v) => v.version === "o") ?? data.versions[0];

			if (original?.url) {
				return {
					fileId: options.remoteId,
					downloadUrl: original.url,
					useDirectDownload: true,
				};
			}
		} catch {
			// fall through to proxy
		}

		return {
			fileId: options.remoteId,
			downloadUrl: undefined,
			useDirectDownload: false,
		};
	}

	/** Stream download for the proxy path. */
	async downloadFile(remoteId: string): Promise<ReadableStream> {
		const dlResponse = await this.requestDownload({ remoteId });
		if (dlResponse.useDirectDownload && dlResponse.downloadUrl) {
			const response = await fetch(dlResponse.downloadUrl);
			if (!response.ok) {
				throw new ProviderError(
					"darkibox",
					`Download failed: ${response.status}`,
				);
			}
			if (!response.body) {
				throw new ProviderError("darkibox", "No response body for download");
			}
			return response.body as unknown as ReadableStream;
		}

		throw new ProviderError(
			"darkibox",
			"No download method available for this file",
			{ remoteId },
		);
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const params: Record<string, string> = { name: options.name };
		if (options.parentId && options.parentId !== ROOT_FOLDER_REMOTE_ID) {
			params["parent_id"] = getFolderId(options.parentId);
		}

		const result = await this.apiGet<DarkiboxFolderCreateResult>(
			"folder/create",
			params,
		);
		return makeFolderRemoteId(result.fld_id);
	}

	async delete(options: DeleteOptions): Promise<void> {
		if (options.isFolder) {
			await this.apiGet<boolean>("folder/delete", {
				fld_id: getFolderId(options.remoteId),
			});
		} else {
			await this.apiGet<boolean>("file/delete", {
				file_code: options.remoteId,
			});
		}
	}

	/**
	 * Move and/or rename a file or folder.
	 * Files   : file/edit (supports file_title + file_fld_id in one call)
	 * Folders : folder/edit (supports name + parent_id in one call)
	 */
	async move(options: MoveOptions): Promise<void> {
		if (isFolderRemoteId(options.remoteId)) {
			const params: Record<string, string> = {
				fld_id: getFolderId(options.remoteId),
			};
			if (options.newName) params["name"] = options.newName;
			if (options.newParentId)
				params["parent_id"] = getFolderId(options.newParentId);
			await this.apiGet<boolean>("folder/edit", params);
		} else {
			const params: Record<string, string> = {
				file_code: options.remoteId,
			};
			if (options.newName) params["file_title"] = options.newName;
			if (options.newParentId)
				params["file_fld_id"] = getFolderId(options.newParentId);
			await this.apiGet<boolean>("file/edit", params);
		}
	}

	/** Clone a file. Folder copy is not supported by the Darkibox API. */
	async copy(options: CopyOptions): Promise<string> {
		if (isFolderRemoteId(options.remoteId)) {
			throw new ProviderError(
				"darkibox",
				"Folder copy is not supported by Darkibox",
			);
		}

		const params: Record<string, string> = { file_code: options.remoteId };
		if (options.newName) params["file_title"] = options.newName;
		if (options.targetParentId)
			params["fld_id"] = getFolderId(options.targetParentId);

		const result = await this.apiGet<DarkiboxFileCloneResult>(
			"file/clone",
			params,
		);
		return result.file_code;
	}

	async list(options: ListOptions): Promise<ListResult> {
		const folderId = options.folderId;
		const isRoot = !folderId || folderId === ROOT_FOLDER_REMOTE_ID;
		const fldId = isRoot ? "0" : getFolderId(folderId);

		// Get subfolders (folder/list returns immediate children of the given folder)
		const folderParams: Record<string, string> = {};
		if (!isRoot) folderParams["fld_id"] = fldId;

		const folderResult = await this.apiGet<
			DarkiboxFolderEntry[] | DarkiboxFolderEntry
		>("folder/list", folderParams);

		// The API may return either an array of children or a single folder object
		let folderEntries: DarkiboxFolderEntry[] = [];
		if (Array.isArray(folderResult)) {
			folderEntries = folderResult;
		} else if (
			folderResult !== null &&
			typeof folderResult === "object" &&
			"subfolders" in folderResult
		) {
			folderEntries = folderResult.subfolders ?? [];
		}

		// Get files via file/list (supports pagination)
		const fileParams: Record<string, string> = {
			fld_id: fldId,
			per_page: String(options.limit ?? 100),
		};
		if (options.pageToken) fileParams["page"] = options.pageToken;

		const fileResult = await this.apiGet<DarkiboxFileListResult>(
			"file/list",
			fileParams,
		);

		const folders: FolderMetadata[] = folderEntries.map((f) => ({
			remoteId: makeFolderRemoteId(f.fld_id),
			name: f.name,
			modifiedAt: new Date(),
		}));

		const files: FileMetadata[] = (fileResult.files ?? []).map((f) => ({
			remoteId: f.file_code,
			name: f.file_title || f.file_code,
			mimeType: "application/octet-stream",
			size: f.file_size,
			modifiedAt: f.created ? new Date(f.created) : new Date(),
		}));

		const nextPageToken =
			fileResult.page < fileResult.pages
				? String(fileResult.page + 1)
				: undefined;

		return { files, folders, nextPageToken };
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		// file/info supports comma-separated codes; with one code the result may
		// be a single object or a one-element array.
		const result = await this.apiGet<DarkiboxFileInfo | DarkiboxFileInfo[]>(
			"file/info",
			{ file_code: remoteId },
		);

		const info = Array.isArray(result) ? result[0] : result;
		if (!info) {
			throw new ProviderError("darkibox", `File not found: ${remoteId}`);
		}

		return {
			remoteId: info.file_code,
			name: info.file_title || info.file_code,
			mimeType: "application/octet-stream",
			size: info.file_size,
			modifiedAt: info.created ? new Date(info.created) : new Date(),
		};
	}

	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		if (remoteId === ROOT_FOLDER_REMOTE_ID) {
			return { remoteId, name: "Root", modifiedAt: new Date() };
		}

		const fldId = getFolderId(remoteId);

		// Darkibox has no direct folder/info endpoint.
		// folder/list with fld_id may return the folder itself or its children.
		try {
			const result = await this.apiGet<
				DarkiboxFolderEntry | DarkiboxFolderEntry[]
			>("folder/list", { fld_id: fldId });

			if (!Array.isArray(result) && result !== null && "name" in result) {
				return { remoteId, name: result.name, modifiedAt: new Date() };
			}
		} catch {
			// ignore, return minimal metadata below
		}

		return { remoteId, name: `folder_${fldId}`, modifiedAt: new Date() };
	}

	/** Called by the provider service after connection to persist account info. */
	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const info = await this.apiGet<DarkiboxAccountInfo>("account/info");
		return { email: info.email, name: info.login };
	}

	async cleanup(): Promise<void> {
		this.config = null;
		this.pendingUploads.clear();
	}
}
