/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs';
import path, { join } from 'path';
import { Readable } from 'stream';
import { promisify } from 'util';

import { ApiKeyProvider, ProviderFile } from '../provider.interface';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);

export class LocalProvider implements ApiKeyProvider {
  private basePath: string;

  constructor(config: Record<string, string>) {
    this.basePath = config['basePath'] || '/';
    this.ensureBasePathExists();
  }

  validateCredentials(): Promise<boolean> {
    return Promise.resolve(true);
  }

  ensureBasePathExists(): void {
    try {
      fs.statSync(this.basePath);
    } catch (error) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  ensureFolderExists(folderId: string): void {
    const folderPath = path.join(this.basePath, folderId);
    try {
      fs.statSync(folderPath);
    } catch (error) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  }

  async uploadFile(
    folderId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.ensureFolderExists(folderId);

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.basePath, folderId, fileName);

    await writeFile(filePath, file.buffer);

    return `${folderId}/${fileName}`;
  }

  async downloadFile(fileId: string): Promise<Readable> {
    const [folderId, fileName] = fileId.split('/');
    const filePath = path.join(this.basePath, folderId, fileName);

    try {
      await stat(filePath);
    } catch (error) {
      throw new Error('File not found');
    }

    const fileBuffer = await readFile(filePath);
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    return stream;
  }

  async getFileMetadata(fileId: string) {
    const [folderId, fileName] = fileId.split('/');
    const filePath = path.join(this.basePath, folderId, fileName);

    try {
      const stats = await stat(filePath);
      return {
        id: fileId,
        name: fileName,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      throw new Error('File not found');
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  getUserInfo() {
    return Promise.resolve({
      id: 'local',
      name: 'Local Storage',
      email: 'storage@localhost',
    });
  }

  async listFiles(path?: string): Promise<ProviderFile[]> {
    const files = await readdir(path ? path : this.basePath);
    const children: ProviderFile[] = [];

    for (const file of files) {
      try {
        const filePath = path ? join(path, file) : file;
        const stats = await stat(filePath);

        children.push({
          id: file,
          name: file,
          size: stats.size,
          type: stats.isDirectory() ? 'folder' : 'file',
          isFolder: stats.isDirectory(),
        });
      } catch (error) {
        // Ignore files that are not readable
        continue;
      }
    }

    return children;
  }
}
