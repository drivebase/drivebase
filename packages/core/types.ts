import type { ActivityType, PermissionRole, ProviderType } from "./enums";

/**
 * Base entity with common fields
 */
export interface BaseEntity {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * User in the system
 */
export interface User extends BaseEntity {
	email: string;
	passwordHash: string;
	isActive: boolean;
	lastLoginAt?: Date;
}

/**
 * Virtual file in the unified filesystem
 */
export interface File extends BaseEntity {
	/** Virtual path that users see */
	virtualPath: string;
	/** Display name of the file */
	name: string;
	/** MIME type */
	mimeType: string;
	/** File size in bytes */
	size: number;
	/** MD5 hash for deduplication and integrity */
	hash?: string;
	/** Provider-specific identifier for the file */
	remoteId: string;
	/** Storage provider ID */
	providerId: string;
	/** Parent folder ID */
	folderId?: string;
	/** User who uploaded the file */
	uploadedBy: string;
	/** Whether the file is deleted (soft delete) */
	isDeleted: boolean;
}

/**
 * Virtual folder in the unified filesystem
 */
export interface Folder extends BaseEntity {
	/** Virtual path that users see */
	virtualPath: string;
	/** Display name of the folder */
	name: string;
	/** Provider-specific identifier for the folder */
	remoteId?: string;
	/** Storage provider ID (null for root folder) */
	providerId?: string;
	/** Parent folder ID (null for root folder) */
	parentId?: string;
	/** User who created the folder */
	createdBy: string;
	/** Whether the folder is deleted (soft delete) */
	isDeleted: boolean;
}

/**
 * Folder permission with role-based access control
 */
export interface Permission extends BaseEntity {
	/** Folder this permission applies to */
	folderId: string;
	/** User this permission is granted to */
	userId: string;
	/** Permission role */
	role: PermissionRole;
	/** User who granted this permission */
	grantedBy: string;
}

/**
 * Storage provider connection
 */
export interface StorageProvider extends BaseEntity {
	/** Display name for the provider */
	name: string;
	/** Provider type */
	type: ProviderType;
	/** Encrypted configuration/credentials (JSON) */
	encryptedConfig: string;
	/** User who connected this provider */
	userId: string;
	/** Whether the provider is currently active */
	isActive: boolean;
	/** Connected account email (OAuth providers) */
	accountEmail?: string;
	/** Connected account display name (OAuth providers) */
	accountName?: string;
	/** Total quota in bytes (null for unlimited) */
	quotaTotal?: number;
	/** Used quota in bytes */
	quotaUsed: number;
	/** Last time quota was synced */
	lastSyncAt?: Date;
}

/**
 * Activity log entry
 */
export interface Activity extends BaseEntity {
	/** Type of activity */
	type: ActivityType;
	/** User who performed the activity */
	userId: string;
	/** File ID if applicable */
	fileId?: string;
	/** Folder ID if applicable */
	folderId?: string;
	/** Provider ID if applicable */
	providerId?: string;
	/** Additional metadata (JSON) */
	metadata?: Record<string, unknown>;
	/** IP address */
	ipAddress?: string;
	/** User agent */
	userAgent?: string;
}

/**
 * Session data stored in Redis
 */
export interface Session {
	userId: string;
	email: string;
	workspaceId: string;
	workspaceRole: string;
	createdAt: number;
	expiresAt: number;
}

/**
 * Rate limit data stored in Redis
 */
export interface RateLimit {
	count: number;
	resetAt: number;
}

/**
 * File upload request
 */
export interface UploadRequest {
	/** File name */
	name: string;
	/** MIME type */
	mimeType: string;
	/** File size in bytes */
	size: number;
	/** Target folder path */
	folderPath: string;
	/** Storage provider ID to use */
	providerId: string;
}

/**
 * File upload response with presigned URL (if supported)
 */
export interface UploadResponse {
	/** File ID */
	fileId: string;
	/** Presigned upload URL (if provider supports it) */
	uploadUrl?: string;
	/** Additional fields required for direct upload */
	uploadFields?: Record<string, string>;
	/** Whether to use direct upload or proxy through API */
	useDirectUpload: boolean;
}

/**
 * File download response with presigned URL (if supported)
 */
export interface DownloadResponse {
	/** File ID */
	fileId: string;
	/** Presigned download URL (if provider supports it) */
	downloadUrl?: string;
	/** Whether to use direct download or stream through API */
	useDirectDownload: boolean;
}

/**
 * Provider quota information
 */
export interface ProviderQuota {
	/** Total quota in bytes (null for unlimited) */
	total?: number;
	/** Used quota in bytes */
	used: number;
	/** Available quota in bytes (null for unlimited) */
	available?: number;
}

/**
 * File metadata from provider
 */
export interface FileMetadata {
	/** Provider-specific file ID */
	remoteId: string;
	/** File name */
	name: string;
	/** MIME type */
	mimeType: string;
	/** File size in bytes */
	size: number;
	/** Last modified timestamp */
	modifiedAt: Date;
	/** MD5 hash (if available) */
	hash?: string;
}

/**
 * Result of initiating a multipart upload
 */
export interface MultipartUploadResult {
	/** Provider-specific upload session ID (e.g. S3 UploadId, Google Drive resumable URI) */
	uploadId: string;
	/** Remote ID / key for the final file */
	remoteId: string;
}

/**
 * Result of uploading a single part
 */
export interface UploadPartResult {
	/** Part number (1-based) */
	partNumber: number;
	/** ETag returned by the provider for this part */
	etag: string;
}

/**
 * Folder metadata from provider
 */
export interface FolderMetadata {
	/** Provider-specific folder ID */
	remoteId: string;
	/** Folder name */
	name: string;
	/** Last modified timestamp */
	modifiedAt: Date;
}
