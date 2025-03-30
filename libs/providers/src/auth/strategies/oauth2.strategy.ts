import { OAuth2Credentials, UserInfo } from '../../types';

/**
 * Abstract class for OAuth2 authentication strategies
 * Each OAuth2 provider should implement this interface
 */
export abstract class OAuth2Strategy {
  /**
   * Get the authorization URL for the OAuth2 flow
   */
  abstract getAuthUrl(redirectUri: string, state?: string): string;

  /**
   * Exchange an authorization code for an access token
   */
  abstract getAccessToken(code: string, redirectUri: string): Promise<OAuth2Credentials>;

  /**
   * Refresh an expired access token using a refresh token
   */
  abstract refreshAccessToken(refreshToken: string): Promise<OAuth2Credentials>;

  /**
   * Validate an access token
   */
  abstract validateToken(credentials: OAuth2Credentials): Promise<boolean>;

  /**
   * Get information about the authenticated user
   */
  abstract getUserInfo(credentials: OAuth2Credentials): Promise<UserInfo>;
}
