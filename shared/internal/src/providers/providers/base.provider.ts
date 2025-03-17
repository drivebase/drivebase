/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  OAuthProvider,
  OAuthConfig,
  AuthToken,
  UserInfo,
} from '../provider.interface';
import { Readable } from 'stream';

export class BaseProvider implements OAuthProvider {
  constructor(public config: OAuthConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Telegram requires OAuth2 authentication');
    }
  }

  getAuthUrl(state?: string): string {
    throw new Error('Method `getAuthUrl` not implemented.');
  }

  getAccessToken(code: string): Promise<AuthToken> {
    throw new Error('Method `getAccessToken` not implemented.');
  }

  refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    throw new Error('Method `refreshAccessToken` not implemented.');
  }

  setCredentials(credentials: Record<string, string>): Promise<void> {
    throw new Error('Method `setCredentials` not implemented.');
  }

  getUserInfo(): Promise<UserInfo> {
    throw new Error('Method `getUserInfo` not implemented.');
  }

  hasFolder(id: string): Promise<boolean> {
    throw new Error('Method `hasFolder` not implemented.');
  }

  createDrivebaseFolder(): Promise<string> {
    throw new Error('Method `createDrivebaseFolder` not implemented.');
  }

  uploadFile(folderId: string, file: Express.Multer.File): Promise<string> {
    throw new Error('Method `uploadFile` not implemented.');
  }

  downloadFile(fileId: string): Promise<Readable> {
    throw new Error('Method `downloadFile` not implemented.');
  }

  getFileMetadata(fileId: string): Promise<any> {
    throw new Error('Method `getFileMetadata` not implemented.');
  }

  deleteFile(path: string): Promise<boolean> {
    throw new Error('Method `deleteFile` not implemented.');
  }
}
