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

export type UserInfo = {
  id?: string;
  name?: string;
  email?: string;
};

export type ProviderFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  isFolder: boolean;
  path?: string;
};
// Base provider interface with common file operations
export interface BaseProvider {
  // File Management
  uploadFile(folderId: string, file: Express.Multer.File): Promise<string>;
  downloadFile(fileId: string): Promise<Readable>;
  getFileMetadata(fileId: string): Promise<any>;
  deleteFile(path: string): Promise<boolean>;
  getUserInfo(): Promise<UserInfo>;
  listFiles(path?: string): Promise<ProviderFile[]>;
}

// OAuth specific provider
export interface OAuthProvider extends BaseProvider {
  validateCredentials(): Promise<boolean>;
  hasFolder(id: string): Promise<boolean>;
  createDrivebaseFolder(): Promise<string>;
  getAuthUrl(state?: string): string;
  getAccessToken(code: string): Promise<AuthToken>;
  refreshAccessToken(refreshToken: string): Promise<AuthToken>;
  setCredentials(credentials: Record<string, string>): Promise<void>;
}

// API key specific provider
export interface ApiKeyProvider extends BaseProvider {
  validateCredentials(): Promise<boolean>;
}

// For backward compatibility
export type CloudProvider = OAuthProvider | ApiKeyProvider;

export const OAUTH_REDIRECT_URI = `${process.env['FRONTEND_URL']}/providers/[type]/callback`;
