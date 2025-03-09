import { IsNotEmpty, IsString } from 'class-validator';

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
  expiresIn?: number;
  tokenType?: string;
}

export interface OAuthProvider {
  config: OAuthConfig;

  // Authentication
  getAuthUrl(state?: string): string;
  getAccessToken(code: string): Promise<AuthToken>;
  refreshAccessToken(refreshToken: string): Promise<AuthToken>;

  // File Management
  // listFiles(path?: string): Promise<any[]>;
  // uploadFile(path: string, file: Blob): Promise<any>;
  // downloadFile(path: string): Promise<Blob>;
  // deleteFile(path: string): Promise<boolean>;
}

export const OAUTH_REDIRECT_URI = `${process.env['NEXT_PUBLIC_APP_URL']}/providers/callback`;
