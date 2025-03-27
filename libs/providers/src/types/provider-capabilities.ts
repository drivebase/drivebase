/**
 * Interfaces for provider capabilities
 */

export interface OAuthCapable {
  authStrategy: {
    getAuthUrl(redirectUri: string, state?: string): string;
    getAccessToken(
      code: string,
      redirectUri: string,
    ): Promise<{
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
      tokenType?: string;
    }>;
  };
}

export interface RootFolderCapable {
  getDrivebaseFolder(): Promise<string>;
}

export interface MetadataCapable {
  setMetadata(metadata: Record<string, any>): void;
}
