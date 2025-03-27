import { Readable } from 'stream';

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  isFolder: boolean;
  createdAt?: Date;
  modifiedAt?: Date;
  parentId?: string;
  thumbnail?: string;
}

export interface UploadOptions {
  overwrite?: boolean;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Options for listing files
 */
export interface ListOptions {
  /**
   * Path to list files from
   */
  path?: string;

  /**
   * Limit the number of results
   */
  limit?: number;

  /**
   * Cursor for pagination (provider-specific token)
   */
  cursor?: string;

  /**
   * Filter by file type
   */
  filter?: {
    mimeType?: string;
    isFolder?: boolean;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /**
   * Total number of items (if available)
   */
  total?: number;

  /**
   * Next page cursor (if available)
   */
  nextCursor?: string;

  /**
   * Previous page cursor (if available)
   */
  prevCursor?: string;

  /**
   * Whether there are more items
   */
  hasMore: boolean;
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  /**
   * Array of items
   */
  data: T[];

  /**
   * Pagination metadata
   */
  pagination: PaginationMeta;
}

export interface SearchOptions {
  query: string;
  path?: string;
  limit?: number;
  fileTypes?: string[];
}

export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface FileDownload {
  stream: Readable;
  metadata: FileMetadata;
}
