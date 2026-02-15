import type {
	DownloadResponse,
	FileMetadata,
	FolderMetadata,
	ProviderQuota,
	UploadResponse,
} from "./types";

/**
 * Storage provider configuration with encrypted credentials
 */
export interface ProviderConfig {
	/** Provider-specific configuration (will be encrypted) */
	[key: string]: unknown;
}

/**
 * Options for file upload
 */
export interface UploadOptions {
	/** File name */
	name: string;
	/** MIME type */
	mimeType: string;
	/** File size in bytes */
	size: number;
	/** Parent folder remote ID (null for root) */
	parentId?: string;
}

/**
 * Options for file download
 */
export interface DownloadOptions {
	/** Remote file ID */
	remoteId: string;
}

/**
 * Options for folder creation
 */
export interface CreateFolderOptions {
	/** Folder name */
	name: string;
	/** Parent folder remote ID (null for root) */
	parentId?: string;
}

/**
 * Options for file/folder deletion
 */
export interface DeleteOptions {
	/** Remote file/folder ID */
	remoteId: string;
	/** Whether it's a folder */
	isFolder?: boolean;
}

/**
 * Options for file/folder move
 */
export interface MoveOptions {
	/** Remote file/folder ID to move */
	remoteId: string;
	/** New parent folder remote ID */
	newParentId?: string;
	/** New name (optional, for rename) */
	newName?: string;
}

/**
 * Options for file/folder copy
 */
export interface CopyOptions {
	/** Remote file/folder ID to copy */
	remoteId: string;
	/** Target parent folder remote ID */
	targetParentId?: string;
	/** New name (optional) */
	newName?: string;
}

/**
 * Options for listing files/folders
 */
export interface ListOptions {
	/** Folder remote ID (null for root) */
	folderId?: string;
	/** Maximum number of items to return */
	limit?: number;
	/** Pagination token */
	pageToken?: string;
}

/**
 * Result from listing files/folders
 */
export interface ListResult {
	/** Files in the folder */
	files: FileMetadata[];
	/** Subfolders in the folder */
	folders: FolderMetadata[];
	/** Next page token (if more results available) */
	nextPageToken?: string;
}

/**
 * Storage provider interface
 * All storage providers must implement this interface
 */
export interface IStorageProvider {
	/**
	 * Initialize the provider with decrypted configuration
	 */
	initialize(config: ProviderConfig): Promise<void>;

	/**
	 * Test the connection to the provider
	 * @returns true if connection is successful, false otherwise
	 */
	testConnection(): Promise<boolean>;

	/**
	 * Get quota information
	 */
	getQuota(): Promise<ProviderQuota>;

	/**
	 * Request file upload
	 * If provider supports presigned URLs, returns uploadUrl
	 * Otherwise, returns uploadUrl as null and expects file to be uploaded via uploadFile()
	 */
	requestUpload(options: UploadOptions): Promise<UploadResponse>;

	/**
	 * Upload file directly (used when provider doesn't support presigned URLs)
	 * @param remoteId - Remote ID from requestUpload
	 * @param data - File data as ReadableStream or Buffer
	 * @returns Optionally returns the final remote ID if it differs from the one provided by requestUpload
	 */
	uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<string | undefined>;

	/**
	 * Request file download
	 * If provider supports presigned URLs, returns downloadUrl
	 * Otherwise, returns downloadUrl as null and expects file to be downloaded via downloadFile()
	 */
	requestDownload(options: DownloadOptions): Promise<DownloadResponse>;

	/**
	 * Download file directly (used when provider doesn't support presigned URLs)
	 * @returns File data as ReadableStream
	 */
	downloadFile(remoteId: string): Promise<ReadableStream>;

	/**
	 * Create a folder
	 * @returns Remote ID of the created folder
	 */
	createFolder(options: CreateFolderOptions): Promise<string>;

	/**
	 * Delete a file or folder
	 */
	delete(options: DeleteOptions): Promise<void>;

	/**
	 * Move a file or folder
	 */
	move(options: MoveOptions): Promise<void>;

	/**
	 * Copy a file or folder
	 * @returns Remote ID of the copied file/folder
	 */
	copy(options: CopyOptions): Promise<string>;

	/**
	 * List files and folders in a directory
	 */
	list(options: ListOptions): Promise<ListResult>;

	/**
	 * Get file metadata
	 */
	getFileMetadata(remoteId: string): Promise<FileMetadata>;

	/**
	 * Get folder metadata
	 */
	getFolderMetadata(remoteId: string): Promise<FolderMetadata>;

	/**
	 * Cleanup resources
	 */
	cleanup(): Promise<void>;
}

/**
 * Storage provider factory function type
 */
export type ProviderFactory = () => IStorageProvider;

/**
 * Authentication type for storage providers
 * - oauth: OAuth 2.0 flow (Google Drive, OneDrive, Dropbox, etc.)
 * - api_key: Static API key or access/secret key pair (S3, etc.)
 * - email_pass: Username/password credentials (FTP, WebDAV, etc.)
 * - no_auth: No authentication required (public buckets, local storage)
 */
export type AuthType = "oauth" | "api_key" | "email_pass" | "no_auth";

/**
 * Result of initiating an OAuth flow
 */
export interface OAuthInitResult {
	/** URL to redirect the user to for authorization */
	authorizationUrl: string;
	/** Opaque state value to validate the callback */
	state: string;
}

/**
 * Configuration field definition for UI generation
 */
export interface ProviderConfigField {
	/** Field name (key in config object) */
	name: string;
	/** Human-readable label */
	label: string;
	/** Field type for UI rendering */
	type: "text" | "password" | "number" | "boolean";
	/** Whether field is required */
	required: boolean;
	/** Help text or description */
	description?: string;
	/** Placeholder text */
	placeholder?: string;
}

/**
 * Storage provider registration
 */
export interface ProviderRegistration {
	/** Factory function to create provider instance */
	factory: ProviderFactory;
	/** Zod schema for validating provider configuration */
	configSchema: unknown; // Will be z.ZodType from zod
	/** Configuration fields for UI generation */
	configFields: ProviderConfigField[];
	/** Human-readable description */
	description: string;
	/** Whether provider supports presigned URLs */
	supportsPresignedUrls: boolean;
	/** Authentication type used by this provider */
	authType: AuthType;
	/**
	 * Initiate an OAuth flow (only for authType = 'oauth')
	 * Returns the authorization URL and the state token (echoed back from the caller).
	 * The caller is responsible for building the state (e.g. including provider ID).
	 */
	initiateOAuth?: (
		config: ProviderConfig,
		callbackUrl: string,
		state: string,
	) => Promise<OAuthInitResult>;
	/**
	 * Handle an OAuth callback (only for authType = 'oauth')
	 * Exchanges the authorization code for tokens and returns
	 * the updated config that should be persisted (encrypted).
	 */
	handleOAuthCallback?: (
		config: ProviderConfig,
		code: string,
		callbackUrl: string,
	) => Promise<ProviderConfig>;
}
