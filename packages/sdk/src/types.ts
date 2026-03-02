// ── Client Configuration ──

export interface DrivebaseClientOptions {
	/** API key for authentication (e.g. "drv_...") */
	apiKey: string;
	/** Workspace ID to operate on */
	workspaceId: string;
	/** Base URL of the Drivebase instance (default: "http://localhost:4000") */
	baseUrl?: string;
	/** Custom fetch implementation (default: globalThis.fetch) */
	fetch?: typeof globalThis.fetch;
}

// ── File Types ──

export interface File {
	id: string;
	virtualPath: string;
	name: string;
	mimeType: string;
	size: number;
	hash: string | null;
	remoteId: string;
	providerId: string;
	folderId: string | null;
	uploadedBy: string;
	isDeleted: boolean;
	starred: boolean;
	createdAt: string;
	updatedAt: string;
	lifecycle: FileLifecycle;
}

export interface FileLifecycle {
	state: FileLifecycleState;
	storageClass: string | null;
	restoreRequestedAt: string | null;
	restoreExpiresAt: string | null;
	lastCheckedAt: string | null;
}

export type FileLifecycleState =
	| "HOT"
	| "ARCHIVED"
	| "RESTORE_REQUESTED"
	| "RESTORING"
	| "RESTORED_TEMPORARY"
	| "UNKNOWN";

export interface FileConnection {
	files: File[];
	total: number;
	hasMore: boolean;
}

export interface PathContents {
	files: File[];
	folders: Folder[];
	folder: Folder | null;
}

export interface SmartSearchResult {
	file: File;
	headline: string;
	rank: number;
}

// ── Folder Types ──

export interface Folder {
	id: string;
	virtualPath: string;
	name: string;
	remoteId: string;
	providerId: string;
	workspaceId: string;
	parentId: string | null;
	createdBy: string;
	isDeleted: boolean;
	starred: boolean;
	createdAt: string;
	updatedAt: string;
}

// ── Upload Types ──

export interface UploadOptions {
	/** File data to upload (File, Blob, Uint8Array, or ArrayBuffer) */
	data: Blob | ArrayBufferView | ArrayBuffer;
	/** File name */
	name: string;
	/** MIME type */
	mimeType: string;
	/** File size in bytes */
	size: number;
	/** Target storage provider ID */
	providerId: string;
	/** Target folder ID (optional — uploads to root if omitted) */
	folderId?: string;
}

export interface UploadProgress {
	/** Bytes uploaded so far */
	loaded: number;
	/** Total bytes */
	total: number;
	/** Progress percentage 0-100 */
	percent: number;
	/** Current phase of the upload */
	phase: "uploading" | "transferring" | "complete";
}

export type ProgressCallback = (progress: UploadProgress) => void;

export interface UploadResponse {
	fileId: string;
	uploadUrl: string | null;
	uploadFields: Record<string, string> | null;
	useDirectUpload: boolean;
}

export interface ChunkedUploadSession {
	sessionId: string;
	totalChunks: number;
	chunkSize: number;
	useDirectUpload: boolean;
	presignedPartUrls: PresignedPartUrl[] | null;
}

export interface PresignedPartUrl {
	partNumber: number;
	url: string;
}

// ── Download Types ──

export interface DownloadResponse {
	fileId: string;
	downloadUrl: string | null;
	useDirectDownload: boolean;
}

export interface DownloadResult {
	/** Direct download URL (if provider supports it) */
	url: string;
	/** Stream the file content */
	stream: () => Promise<ReadableStream<Uint8Array>>;
}

// ── Query Parameters ──

export interface ListFilesParams {
	folderId?: string;
	limit?: number;
	offset?: number;
}

export interface ContentsParams {
	folderId?: string;
	providerIds?: string[];
}

export interface SearchParams {
	query: string;
	limit?: number;
}

export interface RecentFilesParams {
	limit?: number;
}

export interface ListFoldersParams {
	parentId?: string;
	providerIds?: string[];
}

export interface CreateFolderParams {
	name: string;
	providerId: string;
	parentId?: string;
}
