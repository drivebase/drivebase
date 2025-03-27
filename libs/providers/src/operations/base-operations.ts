import { Readable } from 'stream';

import {
  FileMetadata,
  FileUpload,
  ListOptions,
  PaginatedResult,
  SearchOptions,
  UploadOptions,
} from '../types';

/**
 * Abstract class for file operations
 * All file operation implementations should extend this class
 */
export abstract class BaseOperations {
  /**
   * List files in a directory with pagination support
   */
  abstract listFiles(
    options?: ListOptions,
  ): Promise<PaginatedResult<FileMetadata>>;

  /**
   * Upload a file
   */
  abstract uploadFile(
    path: string,
    file: FileUpload,
    options?: UploadOptions,
  ): Promise<FileMetadata>;

  /**
   * Download a file
   */
  abstract downloadFile(id: string): Promise<Readable>;

  /**
   * Delete a file
   */
  abstract deleteFile(id: string): Promise<boolean>;

  /**
   * Get metadata for a file
   */
  abstract getFileMetadata(id: string): Promise<FileMetadata>;

  /**
   * Create a folder (optional)
   */
  createFolder?(path: string, name: string): Promise<FileMetadata>;

  /**
   * Search for files (optional)
   */
  searchFiles?(options: SearchOptions): Promise<PaginatedResult<FileMetadata>>;

  /**
   * Move a file (optional)
   */
  moveFile?(sourceId: string, destinationPath: string): Promise<FileMetadata>;

  /**
   * Copy a file (optional)
   */
  copyFile?(sourceId: string, destinationPath: string): Promise<FileMetadata>;
}
