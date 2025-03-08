export enum AuthMethod {
  OAuth2 = 'oauth2',
  ApiKey = 'api_key',
  None = 'none',
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface ProviderConfig {
  name: string;
  authMethod: AuthMethod;
  oauthConfig?: OAuthConfig;
  apiKey?: string;
}

export interface Provider {
  config: ProviderConfig;

  // Authentication
  getAuthUrl?(state?: string): string;
  getAccessToken?(code: string): Promise<AuthToken>;
  refreshAccessToken?(refreshToken: string): Promise<AuthToken>;

  // File Management
  // listFiles(path?: string): Promise<any[]>;
  // uploadFile(path: string, file: Blob): Promise<any>;
  // downloadFile(path: string): Promise<Blob>;
  // deleteFile(path: string): Promise<boolean>;
}
