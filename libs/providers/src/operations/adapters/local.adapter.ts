import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import {
  FileMetadata,
  FileUpload,
  ListOptions,
  UploadOptions,
} from '../../types';
import { getMimeType } from '../../utils/mime.util';
import { BaseOperations } from '../base-operations';

/**
 * Local filesystem adapter for file operations
 * This adapter can be used for the local provider
 */
export class LocalOperationsAdapter extends BaseOperations {
  private basePath: string;

  constructor(basePath: string) {
    super();
    this.basePath = basePath;
    this.ensureBasePath();
  }

  private ensureBasePath(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private getFullPath(relativePath: string): string {
    const normalizedPath = relativePath.startsWith('/')
      ? relativePath.substring(1)
      : relativePath;
    return path.join(this.basePath, normalizedPath);
  }

  private getRelativePath(fullPath: string): string {
    return fullPath.replace(this.basePath, '').replace(/^\/+/, '/');
  }

  private async getFileStats(filePath: string): Promise<FileMetadata> {
    const stats = await fs.promises.stat(filePath);
    const isFolder = stats.isDirectory();
    const relativePath = this.getRelativePath(filePath);
    const parentPath = path.dirname(relativePath);

    return {
      id: relativePath,
      name: path.basename(filePath),
      path: relativePath,
      size: isFolder ? 0 : stats.size,
      mimeType: isFolder ? 'folder' : getMimeType(filePath),
      isFolder,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      parentId: parentPath === '/' ? undefined : parentPath,
    };
  }

  async listFiles(options?: ListOptions): Promise<FileMetadata[]> {
    const directory = options?.path
      ? this.getFullPath(options.path)
      : this.basePath;

    try {
      const files = await fs.promises.readdir(directory);
      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(directory, file);
          return this.getFileStats(filePath);
        }),
      );

      return fileStats;
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  async uploadFile(
    targetPath: string,
    file: FileUpload,
    options?: UploadOptions,
  ): Promise<FileMetadata> {
    const fullPath = this.getFullPath(path.join(targetPath, file.originalname));
    const directory = path.dirname(fullPath);

    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(directory)) {
        await fs.promises.mkdir(directory, { recursive: true });
      }

      // Check if file exists and overwrite is false
      if (fs.existsSync(fullPath) && options?.overwrite === false) {
        throw new Error('File already exists and overwrite is disabled');
      }

      // Write file
      await fs.promises.writeFile(fullPath, file.buffer);

      return this.getFileStats(fullPath);
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(id: string): Promise<Readable> {
    const fullPath = this.getFullPath(id);

    try {
      // Check if file exists
      await fs.promises.access(fullPath, fs.constants.R_OK);

      // Create readable stream
      return fs.createReadStream(fullPath);
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  async deleteFile(id: string): Promise<boolean> {
    const fullPath = this.getFullPath(id);

    try {
      const stats = await fs.promises.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.promises.rm(fullPath, { recursive: true });
      } else {
        await fs.promises.unlink(fullPath);
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileMetadata(id: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(id);

    try {
      return this.getFileStats(fullPath);
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  async createFolder(path: string, name: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(`${path}/${name}`);

    try {
      await fs.promises.mkdir(fullPath, { recursive: true });
      return this.getFileStats(fullPath);
    } catch (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }
}
