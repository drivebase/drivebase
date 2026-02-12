/**
 * @drivebase/core
 *
 * Core types, interfaces, and enums shared across the Drivebase monorepo.
 * This package provides the foundation for the virtual filesystem abstraction
 * and storage provider plugin architecture.
 */

// Enums
export {
  UserRole,
  PermissionRole,
  ProviderType,
  ActivityType,
} from "./enums";

// Types
export type {
  BaseEntity,
  User,
  File,
  Folder,
  Permission,
  StorageProvider,
  Activity,
  Session,
  RateLimit,
  UploadRequest,
  UploadResponse,
  DownloadResponse,
  ProviderQuota,
  FileMetadata,
  FolderMetadata,
} from "./types";

// Interfaces
export type {
  IStorageProvider,
  ProviderConfig,
  ProviderFactory,
  ProviderRegistration,
  ProviderConfigField,
  AuthType,
  OAuthInitResult,
  UploadOptions,
  DownloadOptions,
  CreateFolderOptions,
  DeleteOptions,
  MoveOptions,
  CopyOptions,
  ListOptions,
  ListResult,
} from "./interfaces";

// Errors
export {
  DrivebaseError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ProviderError,
  QuotaExceededError,
  FileOperationError,
  EncryptionError,
} from "./errors";

// Utils
export {
  SortOrder,
  FilterOperator,
  success,
  failure,
  formatBytes,
  parseBytes,
  sanitizeFilename,
  getFileExtension,
  isValidPath,
  normalizePath,
  joinPath,
  getParentPath,
  getBasename,
  sleep,
  retry,
  debounce,
  throttle,
} from "./utils";

export type {
  PartialBy,
  RequiredBy,
  NonNullish,
  Nullable,
  PaginationParams,
  PaginatedResponse,
  SortParams,
  FilterCondition,
  Result,
  AsyncResult,
} from "./utils";
