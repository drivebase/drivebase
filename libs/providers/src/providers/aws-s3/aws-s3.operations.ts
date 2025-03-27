/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getMimeType } from '@drivebase/providers/utils';
import { Readable } from 'stream';

import { SdkOperationsAdapter } from '../../operations';
import {
  FileMetadata,
  FileUpload,
  ListOptions,
  PaginatedResult,
  PaginationMeta,
  SearchOptions,
  UploadOptions,
} from '../../types';

/**
 * AWS S3 operations implementation
 */
export class AwsS3Operations extends SdkOperationsAdapter<S3Client> {
  private bucket: string;
  private basePath: string;

  constructor(s3Client: S3Client, bucket: string, basePath?: string) {
    super(s3Client);
    this.bucket = bucket;
    this.basePath = basePath || '';

    // Ensure the base path doesn't start with a slash and ends with a slash if not empty
    if (this.basePath) {
      this.basePath = this.basePath.replace(/^\//, '');
      if (!this.basePath.endsWith('/')) {
        this.basePath += '/';
      }
    }
  }

  /**
   * List files in a directory with pagination
   */
  async listFiles(
    options?: ListOptions,
  ): Promise<PaginatedResult<FileMetadata>> {
    try {
      // Handle path formatting
      const path = options?.path || '/';
      const prefix = this.getS3Prefix(path);
      const limit = options?.limit || 1000;

      // Set up pagination parameters
      let continuationToken: string | undefined;
      if (options?.cursor) {
        continuationToken = options.cursor;
      }

      // List objects
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        Delimiter: '/',
        MaxKeys: limit,
        ContinuationToken: continuationToken,
      });

      const response = await this.sdk.send(command);

      // Process the response
      const files: FileMetadata[] = [];

      // Process directories (CommonPrefixes)
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const name = this.getNameFromPrefix(prefix.Prefix);
            // Apply filtering if needed
            if (options?.filter?.isFolder === false) {
              continue;
            }

            files.push({
              id: prefix.Prefix,
              name,
              path: this.getPathFromPrefix(prefix.Prefix),
              size: 0,
              isFolder: true,
              mimeType: 'application/x-directory',
            });
          }
        }
      }

      // Process files (Contents)
      if (response.Contents) {
        for (const item of response.Contents) {
          // Skip the directory prefix itself
          if (item.Key === prefix) continue;

          // Skip items that appear to be directories
          if (item.Key?.endsWith('/')) {
            if (options?.filter?.isFolder === false) {
              continue;
            }
          } else if (options?.filter?.isFolder === true) {
            continue;
          }

          // Apply MIME type filtering if specified
          const mimeType = this.getMimeTypeFromKey(item.Key || '');
          if (
            options?.filter?.mimeType &&
            mimeType !== options.filter.mimeType
          ) {
            continue;
          }

          const name = this.getNameFromKey(item.Key || '');
          files.push({
            id: item.Key || '',
            name,
            path: this.getPathFromKey(item.Key || ''),
            size: item.Size || 0,
            isFolder: false,
            mimeType,
            modifiedAt: item.LastModified,
          });
        }
      }

      // Build pagination metadata
      const pagination: PaginationMeta = {
        hasMore: !!response.NextContinuationToken,
        nextCursor: response.NextContinuationToken,
        total: response.KeyCount,
      };

      return {
        data: files,
        pagination,
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(
    path: string,
    file: FileUpload,
    options?: UploadOptions,
  ): Promise<FileMetadata> {
    try {
      // Determine the S3 key for the file
      const s3Path = this.getS3Prefix(path);
      const key = `${s3Path}${file.originalname}`;

      // Upload the file
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.sdk.send(command);

      // Return metadata for the uploaded file
      return {
        id: key,
        name: file.originalname,
        path:
          path === '/'
            ? `/${file.originalname}`
            : `${path}/${file.originalname}`,
        size: file.buffer.length,
        isFolder: false,
        mimeType: file.mimetype,
        modifiedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download a file
   */
  async downloadFile(id: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: id,
      });

      const response = await this.sdk.send(command);

      if (!response.Body) {
        throw new Error('File is empty or not found');
      }

      // Convert the response body to a readable stream
      return response.Body as Readable;
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(id: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: id,
      });

      await this.sdk.send(command);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get metadata for a file
   */
  async getFileMetadata(id: string): Promise<FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: id,
      });

      const response = await this.sdk.send(command);

      return {
        id,
        name: this.getNameFromKey(id),
        path: this.getPathFromKey(id),
        size: response.ContentLength || 0,
        isFolder: false,
        mimeType: response.ContentType,
        modifiedAt: response.LastModified,
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(path: string, name: string): Promise<FileMetadata> {
    try {
      // S3 doesn't have real folders, just keys with slashes
      // We create an empty object with a trailing slash to represent a folder
      const s3Path = this.getS3Prefix(path);
      const key = `${s3Path}${name}/`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: '',
      });

      await this.sdk.send(command);

      return {
        id: key,
        name,
        path: path === '/' ? `/${name}` : `${path}/${name}`,
        size: 0,
        isFolder: true,
        mimeType: 'application/x-directory',
        modifiedAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Search for files
   */
  async searchFiles(
    options: SearchOptions,
  ): Promise<PaginatedResult<FileMetadata>> {
    try {
      const path = options.path || '/';
      const prefix = this.getS3Prefix(path);

      // S3 doesn't have a search API, so we list all files and filter
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: 1000, // Limit the number of items to search through
      });

      const response = await this.sdk.send(command);
      const files: FileMetadata[] = [];

      // Filter the response based on the search query
      if (response.Contents) {
        for (const item of response.Contents) {
          if (!item.Key) continue;

          const name = this.getNameFromKey(item.Key);

          // Simple client-side filtering based on name
          if (name.toLowerCase().includes(options.query.toLowerCase())) {
            files.push({
              id: item.Key,
              name,
              path: this.getPathFromKey(item.Key),
              size: item.Size || 0,
              isFolder: item.Key.endsWith('/'),
              mimeType: getMimeType(item.Key),
              modifiedAt: item.LastModified,
            });
          }
        }
      }

      return {
        data: files,
        pagination: {
          hasMore: false,
          nextCursor: undefined,
          prevCursor: undefined,
          total: files.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Get a pre-signed URL for direct browser upload (optional)
   */
  async getPresignedUploadUrl(
    path: string,
    filename: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    // try {
    //   const s3Path = this.getS3Prefix(path);
    //   const key = `${s3Path}${filename}`;

    //   const command = new PutObjectCommand({
    //     Bucket: this.bucket,
    //     Key: key,
    //     ContentType: contentType,
    //   });

    //   return getSignedUrl(this.sdk, command, { expiresIn: expiresInSeconds });
    // } catch (error) {
    //   throw new Error(`Failed to generate upload URL: ${error.message}`);
    // }

    return Promise.resolve('');
  }

  /**
   * Transform a raw file response to FileMetadata
   */
  protected transformFileResponse(response: any, path?: string): FileMetadata {
    const name = this.getNameFromKey(response.Key || '');
    const isFolder = response.Key?.endsWith('/') || false;

    return {
      id: response.Key || '',
      name,
      path: path || this.getPathFromKey(response.Key || ''),
      size: response.Size || 0,
      isFolder,
      mimeType: isFolder
        ? 'application/x-directory'
        : getMimeType(response.Key || ''),
      modifiedAt: response.LastModified,
    };
  }

  /**
   * Convert a path to an S3 key prefix
   */
  private getS3Prefix(path: string): string {
    // Handle the root path
    if (path === '/') return this.basePath;

    // Remove leading slash and handle the base path
    const normalizedPath = path.replace(/^\//, '');

    // Combine with base path and ensure trailing slash
    return `${this.basePath}${normalizedPath}${normalizedPath.endsWith('/') ? '' : '/'}`;
  }

  /**
   * Extract a filename from an S3 key
   */
  private getNameFromKey(key: string): string {
    // Remove the base path if it exists
    const keyWithoutBasePath = this.basePath
      ? key.replace(this.basePath, '')
      : key;

    // Get the filename by taking the last part after the last slash
    const parts = keyWithoutBasePath.split('/');
    return parts[parts.length - 1] || keyWithoutBasePath;
  }

  /**
   * Extract a folder name from an S3 prefix
   */
  private getNameFromPrefix(prefix: string): string {
    // Remove the base path if it exists
    const prefixWithoutBasePath = this.basePath
      ? prefix.replace(this.basePath, '')
      : prefix;

    // Remove trailing slash
    const withoutTrailingSlash = prefixWithoutBasePath.replace(/\/$/, '');

    // Get the folder name by taking the last part after the last slash
    const parts = withoutTrailingSlash.split('/');
    return parts[parts.length - 1] || prefixWithoutBasePath;
  }

  /**
   * Extract a path from an S3 key
   */
  private getPathFromKey(key: string): string {
    // Remove the base path if it exists
    const keyWithoutBasePath = this.basePath
      ? key.replace(this.basePath, '')
      : key;

    // Get the path by removing the filename
    const lastSlashIndex = keyWithoutBasePath.lastIndexOf('/');

    if (lastSlashIndex === -1) {
      return '/';
    }

    return `/${keyWithoutBasePath.substring(0, lastSlashIndex)}`;
  }

  /**
   * Extract a path from an S3 prefix
   */
  private getPathFromPrefix(prefix: string): string {
    // Remove the base path if it exists
    const prefixWithoutBasePath = this.basePath
      ? prefix.replace(this.basePath, '')
      : prefix;

    // Remove trailing slash
    const withoutTrailingSlash = prefixWithoutBasePath.replace(/\/$/, '');

    // Get the path by removing the folder name
    const lastSlashIndex = withoutTrailingSlash.lastIndexOf('/');

    if (lastSlashIndex === -1) {
      return '/';
    }

    return `/${withoutTrailingSlash.substring(0, lastSlashIndex)}`;
  }

  private getMimeTypeFromKey(key: string): string {
    // Implement the logic to determine MIME type from the key
    // This is a placeholder and should be replaced with the actual implementation
    return getMimeType(key);
  }
}
