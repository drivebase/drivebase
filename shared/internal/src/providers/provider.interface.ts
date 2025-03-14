import { IsNotEmpty, IsString } from 'class-validator';
import { Readable } from 'stream';

export enum AuthMethod {
  OAuth2 = 'oauth2',
  ApiKey = 'api_key',
  None = 'none',
}

export class OAuthConfig {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  tokenType?: string;
  email?: string | null;
  folderReference?: Record<string, string>;
}

type UserInfo = {
  id?: string;
  name?: string;
  email?: string;
};

export interface OAuthProvider {
  config: OAuthConfig;

  // Authentication
  getAuthUrl(state?: string): string;
  getAccessToken(code: string): Promise<AuthToken>;
  refreshAccessToken(refreshToken: string): Promise<AuthToken>;
  setCredentials(credentials: Record<string, string>): Promise<void>;
  getUserInfo(): Promise<UserInfo>;

  // File Management
  hasFolder(id: string): Promise<boolean>;
  createDrivebaseFolder(): Promise<string>;
  // listFiles(path?: string): Promise<any[]>;
  uploadFile(folderId: string, file: Express.Multer.File): Promise<string>;
  downloadFile(fileId: string): Promise<Readable>;
  getFileMetadata(fileId: string): Promise<any>;
  deleteFile(path: string): Promise<boolean>;
}

export const OAUTH_REDIRECT_URI = `${process.env['NEXT_PUBLIC_APP_URL']}/providers/[type]/callback`;
