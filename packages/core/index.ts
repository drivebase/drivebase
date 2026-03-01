/**
 * @drivebase/core
 *
 * Core types, interfaces, and enums shared across the Drivebase monorepo.
 * This package provides the foundation for the virtual filesystem abstraction
 * and storage provider plugin architecture.
 */

// Enums
export {
	ActivityType,
	PermissionRole,
	ProviderType,
	UserRole,
} from "./enums";
// Errors
export {
	AuthenticationError,
	AuthorizationError,
	ConflictError,
	DrivebaseError,
	EncryptionError,
	FileOperationError,
	NotFoundError,
	ProviderError,
	QuotaExceededError,
	RateLimitError,
	ValidationError,
	toJsonSafeError,
} from "./errors";
export type { JsonSafeError } from "./errors";

// Interfaces
export type {
	ArchiveRequestOptions,
	AuthType,
	CopyOptions,
	CreateFolderOptions,
	DeleteOptions,
	DownloadOptions,
	IStorageProvider,
	LifecycleRestoreTier,
	ListOptions,
	ListResult,
	MoveOptions,
	OAuthInitResult,
	ProviderConfig,
	ProviderConfigField,
	ProviderFactory,
	ProviderFileLifecycleState,
	ProviderLifecycleState,
	ProviderRegistration,
	RestoreRequestOptions,
	UploadOptions,
} from "./interfaces";
// Types
export type {
	Activity,
	BaseEntity,
	DownloadResponse,
	File,
	FileMetadata,
	Folder,
	FolderMetadata,
	MultipartUploadResult,
	Permission,
	ProviderQuota,
	RateLimit,
	Session,
	StorageProvider,
	UploadPartResult,
	UploadRequest,
	UploadResponse,
	User,
} from "./types";
export type {
	AsyncResult,
	FilterCondition,
	NonNullish,
	Nullable,
	PaginatedResponse,
	PaginationParams,
	PartialBy,
	RequiredBy,
	Result,
	SortParams,
} from "./utils";
// Utils
export {
	debounce,
	FilterOperator,
	failure,
	formatBytes,
	getBasename,
	getFileExtension,
	getParentPath,
	isValidPath,
	joinPath,
	normalizePath,
	parseBytes,
	retry,
	SortOrder,
	sanitizeFilename,
	sleep,
	success,
	throttle,
} from "./utils";
