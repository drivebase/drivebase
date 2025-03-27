import { Readable } from 'stream';

import {
  AuthContext,
  AuthCredentials,
  AuthType,
  FileMetadata,
  FileUpload,
  ListOptions,
  ProviderCapability,
  ProviderType,
  SearchOptions,
  UploadOptions,
  UserInfo,
} from '../types';

/**
 * Base provider abstract class that all provider implementations should extend
 */
export abstract class BaseProvider {
  /**
   * The type of provider
   */
  abstract readonly type: ProviderType;

  /**
   * The type of authentication used by this provider
   */
  abstract readonly authType: AuthType;

  /**
   * The capabilities supported by this provider
   */
  abstract readonly capabilities: ProviderCapability[];

  /**
   * Initialize and authenticate the provider with credentials
   */
  abstract authenticate(
    credentials: AuthCredentials,
    context?: AuthContext,
  ): Promise<void>;

  /**
   * Check if the provider is authenticated
   */
  abstract isAuthenticated(): Promise<boolean>;

  /**
   * Get information about the authenticated user
   */
  abstract getUserInfo(): Promise<UserInfo>;

  /**
   * List files in a directory
   */
  abstract listFiles(options?: ListOptions): Promise<FileMetadata[]>;

  /**
   * Upload a file to the provider
   */
  abstract uploadFile(
    path: string,
    file: FileUpload,
    options?: UploadOptions,
  ): Promise<FileMetadata>;

  /**
   * Download a file from the provider
   */
  abstract downloadFile(id: string): Promise<Readable>;

  /**
   * Delete a file or directory
   */
  abstract deleteFile(id: string): Promise<boolean>;

  /**
   * Get metadata for a file
   */
  abstract getFileMetadata(id: string): Promise<FileMetadata>;

  /**
   * Create a folder (optional operation)
   */
  createFolder?(path: string, name: string): Promise<FileMetadata>;

  /**
   * Search for files (optional operation)
   */
  searchFiles?(options: SearchOptions): Promise<FileMetadata[]>;

  /**
   * Move a file (optional operation)
   */
  moveFile?(sourceId: string, destinationPath: string): Promise<FileMetadata>;

  /**
   * Copy a file (optional operation)
   */
  copyFile?(sourceId: string, destinationPath: string): Promise<FileMetadata>;

  /**
   * Check if the provider supports a specific capability
   */
  hasCapability(capability: ProviderCapability): boolean {
    return this.capabilities.includes(capability);
  }
}
