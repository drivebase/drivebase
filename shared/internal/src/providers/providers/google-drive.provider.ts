import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import {
  AuthToken,
  OAuthProvider,
  OAUTH_REDIRECT_URI,
  ProviderFile,
} from '../provider.interface';
import { ProviderType } from '@prisma/client';
import { Readable } from 'stream';
import { z } from 'zod';

const redirectUri = OAUTH_REDIRECT_URI.replace(
  '[type]',
  ProviderType.GOOGLE_DRIVE
);

export class GoogleDriveProvider implements OAuthProvider {
  private oauth2Client: OAuth2Client;
  private driveClient: drive_v3.Drive;

  constructor(private config: Record<string, string>) {
    const parsedConfig = z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        refreshToken: z.string().optional(),
        accessToken: z.string().optional(),
        expiryDate: z.number().optional(),
      })
      .parse(config);

    this.oauth2Client = new OAuth2Client(
      parsedConfig.clientId,
      parsedConfig.clientSecret,
      redirectUri
    );

    this.driveClient = google.drive({
      version: 'v3',
      auth: this.oauth2Client,
    });

    if (
      parsedConfig.refreshToken &&
      parsedConfig.accessToken &&
      parsedConfig.expiryDate
    ) {
      this.oauth2Client.setCredentials({
        refresh_token: parsedConfig.refreshToken,
        access_token: parsedConfig.accessToken,
        expiry_date: parsedConfig.expiryDate,
      });
    }
  }

  async getUserInfo() {
    const response = await this.driveClient.about.get({
      fields: 'user',
    });

    return {
      name: response.data.user?.displayName || undefined,
      email: response.data.user?.emailAddress || undefined,
    };
  }

  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/drive.file',
      redirect_uri: redirectUri,
      state,
    });
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
    };
  }

  async setCredentials(credentials: Record<string, string>): Promise<void> {
    const schema = z.object({
      accessToken: z.string(),
      refreshToken: z.string().optional(),
      expiryDate: z.number().optional(),
    });

    const parsedCreds = schema.parse(credentials);

    this.oauth2Client.setCredentials({
      refresh_token: parsedCreds.refreshToken,
      access_token: parsedCreds.accessToken,
      expiry_date: parsedCreds.expiryDate,
    });

    this.driveClient = google.drive({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  async validateCredentials(): Promise<boolean> {
    const currentDate = Date.now();
    const expiryDate = this.oauth2Client.credentials.expiry_date;

    if (expiryDate && expiryDate < currentDate) {
      if (this.config['refreshToken']) {
        await this.refreshAccessToken(this.config['refreshToken']);
      } else {
        throw new Error('Refresh token not found');
      }
    }

    return true;
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

  async listFiles(path = '/'): Promise<ProviderFile[]> {
    const query = path !== '/' ? `'${path}' in parents` : "'root' in parents";
    const response = await this.driveClient.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, parents)',
    });
    return (
      response.data.files?.map((file) => ({
        id: file.id || '',
        name: file.name || '',
        size: file.size ? Number(file.size) : 0,
        type: file.mimeType || '',
        isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      })) || []
    );
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

  async downloadFile(fileId: string): Promise<Readable> {
    const response = await this.driveClient.files.get(
      {
        fileId,
        alt: 'media',
      },
      { responseType: 'stream' }
    );

    if (!response.data) {
      throw new Error('Failed to download file');
    }

    return response.data as Readable;
  }

  async getFileMetadata(fileId: string) {
    const response = await this.driveClient.files.get({
      fileId,
      fields: 'id,name,mimeType,size',
    });

    if (!response.data) {
      throw new Error('Failed to get file metadata');
    }

    return response.data;
  }

  async deleteFile(fileId: string): Promise<boolean> {
    await this.driveClient.files.delete({
      fileId,
    });
    return true;
  }
}
