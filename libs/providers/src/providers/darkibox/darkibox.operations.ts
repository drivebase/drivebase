/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

import { PaginationMeta } from '@drivebase/common';

import { SdkOperationsAdapter } from '../../operations';
import {
  FileMetadata,
  FileUpload,
  ListOptions,
  PaginatedResult,
  SearchOptions,
  UploadOptions,
} from '../../types';
import { DarkiboxCredentials } from './darkibox.auth';

type FileInfo = {
  file_name: string;
  status: number;
  file_title: string;
  player_img: string;
  file_code: string;
  file_premium_only: number;
  file_length: number;
  file_size: number;
  streaming: number;
};

/**
 * Darkibox operations implementation
 */
export class DarkiboxOperations extends SdkOperationsAdapter {
  private static readonly API_BASE_URL = 'https://darkibox.com/api';
  private apiKey: string;
  private endpoint: string;
  private uploadServer = '';

  constructor(credentials: DarkiboxCredentials) {
    super({});
    this.apiKey = credentials.apiKey;
    this.endpoint = credentials.endpoint || DarkiboxOperations.API_BASE_URL;
  }

  /**
   * Get upload server URL
   */
  private async getUploadServer(): Promise<string> {
    if (this.uploadServer) {
      return this.uploadServer;
    }

    try {
      const response = await axios.get(`${this.endpoint}/upload/server?key=${this.apiKey}`);

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to get upload server');
      }

      this.uploadServer = response.data.result;
      return this.uploadServer;
    } catch (error) {
      throw new Error(`Failed to get upload server: ${error.message}`);
    }
  }

  /**
   * Create the base DriveBase folder in Darkibox
   */
  async createDrivebaseFolder(name: string = 'DriveBase'): Promise<string> {
    try {
      const response = await axios.get(
        `${this.endpoint}/folder/create?key=${this.apiKey}&name=${encodeURIComponent(name)}`,
      );

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to create DriveBase folder');
      }

      return response.data.result.fld_id;
    } catch (error) {
      throw new Error(`Failed to create DriveBase folder: ${error.message}`);
    }
  }

  /**
   * Check if a folder exists
   */
  async folderExists(id: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.endpoint}/folder/list?key=${this.apiKey}&fld_id=${id}`,
      );
      return response.data?.status === 200 && response.data?.msg === 'OK';
    } catch {
      return false;
    }
  }

  /**
   * List files in a directory with pagination
   */
  async listFiles(options?: ListOptions): Promise<PaginatedResult<FileMetadata>> {
    try {
      const folderId = options?.referenceId || options?.path || '0';

      const response = await axios.get(
        `${this.endpoint}/folder/list?key=${this.apiKey}&fld_id=${folderId}&files=1`,
      );

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to list files');
      }

      const folders = response.data.result.folders || [];
      const files = response.data.result.files || [];

      // Convert folder objects to FileMetadata
      const folderMetadata = folders.map((folder: any) => this.transformFolderResponse(folder));

      // Convert file objects to FileMetadata
      const fileMetadata = files.map((file: any) => this.transformFileResponse(file));

      // Combine folders and files
      const allItems = [...folderMetadata, ...fileMetadata];

      // Apply pagination if needed
      let paginatedItems = allItems;
      if (options?.limit) {
        const startIndex = options.cursor ? parseInt(options.cursor, 10) : 0;
        const endIndex = startIndex + options.limit;
        paginatedItems = allItems.slice(startIndex, endIndex);
      }

      // Build pagination metadata
      const hasMore = paginatedItems.length < allItems.length;
      const nextCursor = hasMore
        ? `${(options?.cursor ? parseInt(options.cursor, 10) : 0) + paginatedItems.length}`
        : undefined;

      const meta: PaginationMeta = {
        nextCursor,
        hasMore,
      };

      return {
        data: paginatedItems,
        meta,
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
      // Get upload server
      const uploadServer = await this.getUploadServer();

      // Get parent folder ID
      const folderId = await this.getOrCreateFolder(path);

      // Create form data for multipart/form-data request using form-data package
      const formData = new FormData();
      formData.append('key', this.apiKey);

      // Add the file to the form
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      if (folderId !== '0') {
        formData.append('fld_id', folderId);
      }

      // Upload the file
      const response = await axios.post(uploadServer, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to upload file');
      }

      // Get the first file code from the response
      const fileCode = response.data.files?.[0]?.filecode;
      if (!fileCode) {
        throw new Error('Failed to get file code from upload response');
      }

      // Get file metadata using the file code
      return this.getFileMetadata(fileCode);
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload a file by URL
   */
  async uploadFileByUrl(path: string, url: string, options?: UploadOptions): Promise<FileMetadata> {
    try {
      // Get parent folder ID
      const folderId = await this.getOrCreateFolder(path);

      // Build URL parameters
      let params = `key=${this.apiKey}&url=${encodeURIComponent(url)}`;

      if (folderId !== '0') {
        params += `&fld_id=${folderId}`;
      }

      // Start the URL upload
      const response = await axios.get(`${this.endpoint}/upload/url?${params}`);

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to start URL upload');
      }

      // The API returns a future filecode
      const fileCode = response.data.result?.filecode;
      if (!fileCode) {
        throw new Error('Failed to get file code from upload response');
      }

      // Note: URL uploads happen asynchronously, so we return a stub metadata
      // The actual file may not be ready immediately
      return {
        id: fileCode,
        name: url.split('/').pop() || 'unknown',
        path: path,
        size: 0, // Unknown until processed
        mimeType: 'application/octet-stream', // Unknown until processed
        createdAt: new Date(),
        modifiedAt: new Date(),
        isFolder: false,
        parentId: folderId,
      };
    } catch (error) {
      throw new Error(`Failed to upload file by URL: ${error.message}`);
    }
  }

  /**
   * Download a file
   */
  async downloadFile(id: string): Promise<Readable> {
    try {
      // First get the file info to get the download link
      const fileInfo = await this.getFileInfo(id);

      if (!fileInfo.link) {
        throw new Error('File download link not available');
      }

      // Request the file with stream response
      const response = await axios.get(fileInfo.link, {
        responseType: 'stream',
      });

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
      const response = await axios.get(
        `${this.endpoint}/file/delete?key=${this.apiKey}&file_code=${id}`,
      );

      return response.data?.status === 200 && response.data?.msg === 'OK';
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get metadata for a file
   */
  async getFileMetadata(id: string): Promise<FileMetadata> {
    try {
      const fileInfo = await this.getFileInfo(id);
      return this.transformFileInfoResponse(fileInfo[0]);
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(path: string, name: string): Promise<FileMetadata> {
    try {
      // Get parent folder ID
      const parentId = await this.getOrCreateFolder(path);

      const response = await axios.get(
        `${this.endpoint}/folder/create?key=${this.apiKey}&name=${encodeURIComponent(name)}&parent_id=${parentId}`,
      );

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to create folder');
      }

      const folderId = response.data.result.fld_id;

      // Return folder metadata
      return {
        id: folderId,
        name: name,
        path: path ? `${path}/${name}` : name,
        size: 0,
        mimeType: 'folder',
        createdAt: new Date(),
        modifiedAt: new Date(),
        isFolder: true,
        parentId: parentId !== '0' ? parentId : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Search for files
   */
  searchFiles(options: SearchOptions): Promise<PaginatedResult<FileMetadata>> {
    throw new Error('Not supported');
  }

  /**
   * Get file info from Darkibox API
   */
  private async getFileInfo(fileCode: string): Promise<any> {
    const response = await axios.get(
      `${this.endpoint}/file/info?key=${this.apiKey}&file_code=${fileCode}`,
    );

    if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
      throw new Error('Failed to get file info');
    }

    return response.data.result;
  }

  /**
   * Get or create folder path
   */
  private async getOrCreateFolder(path?: string): Promise<string> {
    if (!path || path === '/') {
      return '0'; // Root folder in Darkibox
    }

    // Remove leading/trailing slashes and split path
    const normalizedPath = path.replace(/^\/+|\/+$/g, '');
    const pathParts = normalizedPath.split('/');

    let currentFolderId = '0'; // Start from root

    // Create each folder in the path if it doesn't exist
    for (const folderName of pathParts) {
      // List current folder to find if the next part exists
      const response = await axios.get(
        `${this.endpoint}/folder/list?key=${this.apiKey}&fld_id=${currentFolderId}`,
      );

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error(`Failed to list folder: ${currentFolderId}`);
      }

      const folders = response.data.result.folders || [];
      const existingFolder = folders.find((f: any) => f.name === folderName);

      if (existingFolder) {
        currentFolderId = existingFolder.fld_id;
      } else {
        // Create the folder
        const createResponse = await axios.get(
          `${this.endpoint}/folder/create?key=${this.apiKey}&name=${encodeURIComponent(folderName)}&parent_id=${currentFolderId}`,
        );

        if (createResponse.data?.status !== 200 || createResponse.data?.msg !== 'OK') {
          throw new Error(`Failed to create folder: ${folderName}`);
        }

        currentFolderId = createResponse.data.result.fld_id;
      }
    }

    return currentFolderId;
  }

  /**
   * Transform Darkibox file response to FileMetadata
   */
  protected transformFileResponse(file: FileInfo): FileMetadata {
    return {
      id: file.file_code,
      name: file.file_name || file.file_code,
      path: `/${file.file_name}`,
      size: file.file_size,
      mimeType: 'video/mp4',
      createdAt: new Date(),
      modifiedAt: new Date(),
      isFolder: false,
      parentId: undefined,
      thumbnail: file.player_img,
    };
  }

  /**
   * Transform Darkibox file info response to FileMetadata
   */
  protected transformFileInfoResponse(fileInfo: FileInfo): FileMetadata {
    return {
      id: fileInfo.file_code,
      name: fileInfo.file_name || fileInfo.file_code,
      path: `/${fileInfo.file_name}`,
      size: fileInfo.file_size,
      mimeType: 'video/mp4',
      createdAt: new Date(),
      modifiedAt: new Date(),
      isFolder: false,
      parentId: undefined,
      thumbnail: fileInfo.player_img,
    };
  }

  /**
   * Transform Darkibox folder response to FileMetadata
   */
  protected transformFolderResponse(folder: any): FileMetadata {
    return {
      id: folder.fld_id,
      name: folder.name,
      path: `/${folder.fld_id}`,
      size: 0,
      mimeType: 'folder',
      createdAt: new Date(),
      modifiedAt: new Date(),
      isFolder: true,
      parentId: folder.parent_id !== '0' ? folder.parent_id : undefined,
    };
  }
}
