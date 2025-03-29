/* eslint-disable @typescript-eslint/no-unused-vars */
import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
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
 * Google Drive operations implementation
 */
export class GoogleDriveOperations extends SdkOperationsAdapter {
  private driveClient: drive_v3.Drive;

  constructor(oauth2Client: OAuth2Client) {
    super(oauth2Client);
    this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Create the base DriveBase folder in the user's Drive
   */
  async createDrivebaseFolder(name: string = 'DriveBase'): Promise<string> {
    try {
      const response = await this.driveClient.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      if (!response.data.id) {
        throw new Error('Failed to create DriveBase folder');
      }

      return response.data.id;
    } catch (error) {
      throw new Error(`Failed to create DriveBase folder: ${error.message}`);
    }
  }

  /**
   * Check if a folder exists
   */
  async folderExists(id: string): Promise<boolean> {
    try {
      await this.driveClient.files.get({
        fileId: id,
        fields: 'id,mimeType',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory with pagination
   */
  async listFiles(options?: ListOptions): Promise<PaginatedResult<FileMetadata>> {
    try {
      const path = options?.path || '/';
      const query = this.buildFileQuery(path);
      const limit = options?.limit || 100;

      // Create list request
      const listOptions: drive_v3.Params$Resource$Files$List = {
        q: query,
        pageSize: limit,
        fields:
          'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, trashed)',
        orderBy: 'folder,name',
        includeItemsFromAllDrives: false,
        supportsAllDrives: false,
      };

      // Add page token if cursor is provided
      if (options?.cursor) {
        listOptions.pageToken = options.cursor;
      }

      // Apply filter if provided
      if (options?.filter) {
        let filterQuery = query;

        if (options.filter.mimeType) {
          filterQuery += ` and mimeType = '${options.filter.mimeType}'`;
        }

        if (options.filter.isFolder !== undefined) {
          filterQuery += options.filter.isFolder
            ? " and mimeType = 'application/vnd.google-apps.folder'"
            : " and mimeType != 'application/vnd.google-apps.folder'";
        }

        listOptions.q = filterQuery;
      }

      // Execute the request
      const response = await this.driveClient.files.list(listOptions);

      // Process the results
      const files = response.data.files || [];
      const nextCursor = response.data.nextPageToken || undefined;

      // Transform to FileMetadata array
      const result = files
        .filter((file) => !file.trashed)
        .map((file) => this.transformFileResponse(file, path));

      // Build pagination metadata
      const pagination: PaginationMeta = {
        nextCursor,
        // Google Drive API doesn't provide total count or previous cursor
        hasMore: !!nextCursor,
      };

      return {
        data: result,
        pagination,
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(path: string, file: FileUpload, options?: UploadOptions): Promise<FileMetadata> {
    try {
      const parentId = await this.getOrCreateFolder(path);
      const fileStream = this.createReadableStream(file.buffer);

      const response = await this.driveClient.files.create({
        requestBody: {
          name: file.originalname,
          mimeType: file.mimetype,
          parents: [parentId],
        },
        media: {
          mimeType: file.mimetype,
          body: fileStream,
        },
        fields: 'id, name, mimeType, size, parents, createdTime, modifiedTime',
      });

      if (!response.data.id) {
        throw new Error('Failed to upload file');
      }

      return this.transformFileResponse(response.data, path);
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download a file
   */
  async downloadFile(id: string): Promise<Readable> {
    try {
      const response = await this.driveClient.files.get(
        {
          fileId: id,
          alt: 'media',
        },
        {
          responseType: 'stream',
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(id: string): Promise<boolean> {
    try {
      await this.driveClient.files.delete({
        fileId: id,
      });
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
      const response = await this.driveClient.files.get({
        fileId: id,
        fields: 'id, name, mimeType, size, parents, createdTime, modifiedTime',
      });

      if (!response.data.id) {
        throw new Error('File not found');
      }

      return this.transformFileResponse(response.data);
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(path: string, name: string): Promise<FileMetadata> {
    try {
      const parentId = await this.getOrCreateFolder(path);

      const response = await this.driveClient.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id, name, mimeType, parents, createdTime, modifiedTime',
      });

      if (!response.data.id) {
        throw new Error('Failed to create folder');
      }

      return this.transformFileResponse(response.data, path);
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Search for files
   */
  async searchFiles(options: SearchOptions): Promise<PaginatedResult<FileMetadata>> {
    try {
      let query = `name contains '${options.query.replace(/'/g, "\\'")}'`;

      if (options.path) {
        const parentId = await this.getParentId(options.path);
        query += ` and '${parentId}' in parents`;
      }

      if (options.fileTypes && options.fileTypes.length > 0) {
        const mimeTypes = options.fileTypes.map((type) => `mimeType = '${type}'`).join(' or ');
        query += ` and (${mimeTypes})`;
      }

      const response = await this.driveClient.files.list({
        q: query,
        fields: 'files(id, name, mimeType, size, parents, createdTime, modifiedTime)',
        pageSize: options.limit || 100,
      });

      return {
        data: this.mapDriveFilesToFileMetadata(response.data.files || []),
        pagination: {
          hasMore: false,
          nextCursor: undefined,
          prevCursor: undefined,
          total: response.data.files?.length || 0,
        },
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Create a readable stream from a buffer
   */
  private createReadableStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  /**
   * Build a query for listing files
   */
  private buildFileQuery(path: string): string {
    // For subfolders, we need to find the parent folder ID first
    if (path !== '/') {
      return `'${path}' in parents and trashed = false`;
    }

    // If listing root, search for files owned by the user
    return `'root' in parents and trashed = false`;
  }

  /**
   * Get or create a folder path
   */
  private async getOrCreateFolder(path: string): Promise<string> {
    if (path === '/') {
      // Use the user's Drive root
      return Promise.resolve('root');
    }

    // TODO: Implement folder path creation
    return 'root';
  }

  /**
   * Get the parent ID for a path
   */
  private async getParentId(path: string): Promise<string> {
    return Promise.resolve(path);
  }

  /**
   * Map Google Drive files to FileMetadata objects
   */
  private mapDriveFilesToFileMetadata(files: drive_v3.Schema$File[]): FileMetadata[] {
    return files.map((file) => this.transformFileResponse(file));
  }

  /**
   * Transform a Google Drive file response to FileMetadata
   */
  protected transformFileResponse(file: drive_v3.Schema$File, path?: string): FileMetadata {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

    if (!file.id || !file.name) {
      throw new Error('Invalid file response');
    }

    return {
      id: file.id,
      name: file.name,
      path: path ? `${path}/${file.name}` : file.name,
      size: isFolder ? 0 : Number(file.size) || 0,
      mimeType: file.mimeType || undefined,
      isFolder,
      createdAt: file.createdTime ? new Date(file.createdTime) : undefined,
      modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
      parentId: file.parents?.[0],
    };
  }
}
