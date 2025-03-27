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

export interface ListOptions {
  path?: string;
  limit?: number;
  cursor?: string;
  recursive?: boolean;
  includeDeleted?: boolean;
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
