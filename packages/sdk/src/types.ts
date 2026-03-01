/**
 * Core types for Drivebase SDK
 */

export interface DrivebaseConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AuthConfig {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  provider: string;
  path: string;
}

export interface UploadOptions {
  provider?: string;
  path?: string;
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
}

export interface DownloadOptions {
  provider?: string;
  onProgress?: (progress: number) => void;
}

export interface ListOptions {
  provider?: string;
  path?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteOptions {
  provider?: string;
  permanent?: boolean;
}

export interface UploadResult {
  id: string;
  url: string;
  metadata: FileMetadata;
}

export interface ListResult {
  files: FileMetadata[];
  total: number;
  hasMore: boolean;
}
