export interface AuthCredentials {
  [key: string]: any;
}

export interface OAuth2Credentials extends AuthCredentials {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  tokenType?: string | null;
}

export interface ApiKeyCredentials extends AuthCredentials {
  [key: string]: string;
}

export interface BasicAuthCredentials extends AuthCredentials {
  username: string;
  password: string;
}

export interface FileSystemCredentials extends AuthCredentials {
  basePath?: string;
}

export interface UserInfo {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  displayName?: string | null;
  picture?: string | null;
}

export interface AuthContext {
  userId?: string | null;
  workspaceId?: string | null;
  state?: string | null;
}
