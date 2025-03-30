import { OAuth2Client } from 'google-auth-library';

import { OAuth2Strategy } from '../../auth';
import { OAuth2Credentials, UserInfo } from '../../types';

/**
 * Google Drive OAuth2 authentication strategy
 */
export class GoogleDriveAuthStrategy extends OAuth2Strategy {
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  private oauth2Client: OAuth2Client;

  constructor(clientId?: string, clientSecret?: string) {
    super();
    this.oauth2Client = new OAuth2Client({
      clientId,
      clientSecret,
    });
  }

  /**
   * Get the OAuth2 authorization URL
   */
  getAuthUrl(redirectUri: string, state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GoogleDriveAuthStrategy.SCOPES,
      redirect_uri: redirectUri,
      state,
      prompt: 'consent', // Force to get refresh token
    });
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string, redirectUri: string): Promise<OAuth2Credentials> {
    try {
      const { tokens } = await this.oauth2Client.getToken({
        code,
        redirect_uri: redirectUri,
      });

      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      this.oauth2Client.setCredentials(tokens);

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date,
        tokenType: tokens.token_type,
      };
    } catch (error) {
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuth2Credentials> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresAt: credentials.expiry_date,
        tokenType: credentials.token_type,
      };
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Validate token by checking expiry and refreshing if needed
   */
  async validateToken(credentials: OAuth2Credentials): Promise<boolean> {
    const { accessToken, refreshToken, expiresAt } = credentials;

    if (!accessToken) {
      return false;
    }

    // If token is expired and we have a refresh token, refresh it
    if (expiresAt && expiresAt < Date.now() && refreshToken) {
      await this.refreshAccessToken(refreshToken);
    }

    return true;
  }

  /**
   * Get information about the authenticated user
   */
  async getUserInfo(credentials: OAuth2Credentials): Promise<UserInfo> {
    try {
      this.setClientCredentials(credentials);

      const { google } = await import('googleapis');
      const oauth2 = google.oauth2('v2');

      const userInfoResponse = await oauth2.userinfo.get({
        auth: this.oauth2Client,
      });

      return {
        id: userInfoResponse.data.id,
        email: userInfoResponse.data.email,
        name: userInfoResponse.data.name,
        displayName: userInfoResponse.data.name,
        picture: userInfoResponse.data.picture,
      };
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Get the initialized OAuth2 client
   */
  getOAuth2Client(credentials?: OAuth2Credentials): OAuth2Client {
    if (credentials) {
      this.setClientCredentials(credentials);
    }
    return this.oauth2Client;
  }

  /**
   * Set credentials on the OAuth2 client
   */
  private setClientCredentials(credentials: OAuth2Credentials): void {
    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiresAt,
      token_type: credentials.tokenType,
    });
  }
}
