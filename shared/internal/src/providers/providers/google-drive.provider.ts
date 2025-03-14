import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import {
  AuthToken,
  OAuthProvider,
  OAuthConfig,
  OAUTH_REDIRECT_URI,
} from '../provider.interface';
import { ProviderType } from '@prisma/client';
import { Readable } from 'stream';

const redirectUri = OAUTH_REDIRECT_URI.replace(
  '[type]',
  ProviderType.GOOGLE_DRIVE
);

export class GoogleDriveProvider implements OAuthProvider {
  private oauth2Client: OAuth2Client;
  private driveClient: drive_v3.Drive;

  constructor(public config: OAuthConfig) {
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      redirectUri
    );

    this.driveClient = google.drive({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  async getUserInfo(): Promise<any> {
    const response = await this.driveClient.about.get({
      fields: 'user',
    });

    return {
      name: response.data.user?.displayName,
      email: response.data.user?.emailAddress,
    };
  }

  async setCredentials(credentials: Record<string, string>) {
    if (!credentials['accessToken']) {
      throw new Error('Failed to set access token');
    }

    const expiry = new Date(credentials['expiryDate']);

    if (expiry < new Date()) {
      await this.refreshAccessToken(credentials['refreshToken']);
    } else {
      this.oauth2Client.setCredentials({
        access_token: credentials['accessToken'],
      });
    }
  }

  getAuthUrl(state?: string): string {
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/drive.file',
      redirect_uri: redirectUri,
      state,
    });

    return url;
  }

  async getAccessToken(code: string): Promise<AuthToken> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.expiry_date) {
      throw new Error('Failed to get access token');
    }

    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
    });

    return {
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
      refreshToken: tokens.refresh_token || undefined,
      tokenType: tokens.token_type || undefined,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error('Failed to refresh access token');
    }

    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
    });

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiryDate: credentials.expiry_date,
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

  async createFolder(name: string) {
    const folder = await this.driveClient.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    const json = folder.data;

    if (!json.id) {
      throw new Error('Failed to create folder');
    }

    return {
      id: json.id,
      name: name,
      path: `/${name}`,
    };
  }

  async createDrivebaseFolder() {
    const folder = await this.driveClient.files.create({
      requestBody: {
        name: process.env['DRIVEBASE_FOLDER_NAME'],
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    const json = folder.data;

    if (!json.id) {
      throw new Error('Failed to create folder');
    }

    return json.id;
  }

  async hasFolder(id: string): Promise<boolean> {
    try {
      await this.driveClient.files.get({
        fileId: id,
      });
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(folderId: string, file: Express.Multer.File) {
    const fileStream = new Readable();
    fileStream.push(file.buffer);
    fileStream.push(null);

    const media = {
      mimeType: file.mimetype,
      body: fileStream,
    };

    const response = await this.driveClient.files.create({
      requestBody: {
        name: file.originalname,
        parents: [folderId],
      },
      media,
      fields: 'id',
    });

    if (!response.data.id) {
      throw new Error('Failed to upload file');
    }

    return response.data.id;
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
