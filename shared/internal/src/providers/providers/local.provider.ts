/* eslint-disable @typescript-eslint/no-unused-vars */
import { UserInfo, ApiKeyProvider } from '../provider.interface';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

export class LocalProvider implements ApiKeyProvider {
  private basePath: string;

  constructor(config: Record<string, string>) {
    this.basePath = config['basePath'] || path.join(process.cwd(), 'storage');
    this.ensureBasePathExists();
  }

  validateCredentials(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async ensureBasePathExists(): Promise<void> {
    try {
      await stat(this.basePath);
    } catch (error) {
      await mkdir(this.basePath, { recursive: true });
    }
  }

  async ensureFolderExists(folderId: string): Promise<void> {
    const folderPath = path.join(this.basePath, folderId);
    try {
      await stat(folderPath);
    } catch (error) {
      await mkdir(folderPath, { recursive: true });
    }
  }

  async uploadFile(
    folderId: string,
    file: Express.Multer.File
  ): Promise<string> {
    await this.ensureFolderExists(folderId);

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
    const [folderId, fileName] = filePath.split('/');
    const fullPath = path.join(this.basePath, folderId, fileName);

    try {
      await unlink(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserInfo(): Promise<UserInfo> {
    return {
      id: 'local',
      name: 'Local Storage',
      email: 'storage@localhost',
    };
  }
}
