/**
 * User roles in the system
 */
export enum UserRole {
  /** Read-only access to shared files */
  VIEWER = "viewer",
  /** Can upload, edit, and organize files */
  EDITOR = "editor",
  /** Can manage users and connect providers */
  ADMIN = "admin",
  /** Full system access, can manage all users and providers */
  OWNER = "owner",
}

/**
 * Permission roles for folders with inheritance
 */
export enum PermissionRole {
  /** View only */
  VIEWER = "viewer",
  /** View and edit */
  EDITOR = "editor",
  /** View, edit, delete, and manage permissions */
  ADMIN = "admin",
  /** Full control */
  OWNER = "owner",
}

/**
 * Storage provider types
 */
export enum ProviderType {
  /** Google Drive cloud storage */
  GOOGLE_DRIVE = "google_drive",
  /** S3-compatible storage (AWS, MinIO, DigitalOcean Spaces, etc.) */
  S3 = "s3",
  /** Local filesystem paths */
  LOCAL = "local",
}

/**
 * File operation types for activity logging
 */
export enum ActivityType {
  UPLOAD = "upload",
  DOWNLOAD = "download",
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  MOVE = "move",
  COPY = "copy",
  SHARE = "share",
  UNSHARE = "unshare",
}
