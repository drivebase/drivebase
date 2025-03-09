import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import {
  AuthToken,
  OAuthProvider,
  OAuthConfig,
  OAUTH_REDIRECT_URI,
} from '../provider.interface';

export class GoogleDriveProvider implements OAuthProvider {
  private oauth2Client: OAuth2Client;
  private driveClient: drive_v3.Drive;

  constructor(public config: OAuthConfig) {
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      OAUTH_REDIRECT_URI
    );

    this.driveClient = google.drive({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  getAuthUrl(state?: string): string {
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/drive.file',
      redirect_uri: OAUTH_REDIRECT_URI,
      state,
    });

    return url;
  }

  async getAccessToken(code: string): Promise<AuthToken> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('Failed to get access token');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || undefined,
      expiresIn: tokens.expiry_date
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
        : undefined,
      tokenType: tokens.token_type || undefined,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresIn: credentials.expiry_date
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : undefined,
      tokenType: credentials.token_type || undefined,
    };
  }

  async listFiles(path?: string) {
    const query = path ? `'${path}' in parents` : "'root' in parents";
    const response = await this.driveClient.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, parents)',
    });
    return response.data.files || [];
  }

  async uploadFile(path: string, file: Blob) {
    const parentId = path === 'root' ? 'root' : path;
    const media = {
      mimeType: file.type,
      body: file,
    };
    const response = await this.driveClient.files.create({
      requestBody: {
        name: file.name,
        parents: [parentId],
      },
      media,
      fields: 'id, name, mimeType, size, parents',
    });
    return response.data;
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.driveClient.files.get(
      {
        fileId,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );
    if (!response.data) {
      throw new Error('Failed to download file');
    }
    return new Blob([response.data as ArrayBuffer]);
  }

  async deleteFile(fileId: string): Promise<boolean> {
    await this.driveClient.files.delete({
      fileId,
    });
    return true;
  }
}
