import { Readable } from 'stream';

import { Field, ObjectType } from '@nestjs/graphql';

import { IPaginatedResult, createPaginatedResult } from '@drivebase/common';

@ObjectType()
export class FileMetadata {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  path: string;

  @Field(() => Number, { nullable: true })
  size?: number;

  @Field(() => String, { nullable: true })
  mimeType?: string;

  @Field(() => Boolean)
  isFolder: boolean;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Field(() => Date, { nullable: true })
  modifiedAt?: Date;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field(() => String, { nullable: true })
  parentPath?: string;

  @Field(() => String, { nullable: true })
  thumbnail?: string;
}

export const PaginatedFileMetadata = createPaginatedResult(FileMetadata);
export type PaginatedFileMetadataType = InstanceType<typeof PaginatedFileMetadata>;

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

  /**
   * Reference ID for the file
   */
  referenceId?: string;
}

export type PaginatedResult<T> = IPaginatedResult<T>;

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
