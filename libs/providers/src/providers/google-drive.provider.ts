import { ProviderType } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';
import { Readable } from 'stream';
import { z } from 'zod';

import {
  AuthToken,
  OAUTH_REDIRECT_URI,
  OAuthProvider,
  ProviderFile,
} from '../provider.interface';

const redirectUri = OAUTH_REDIRECT_URI.replace(
  '[type]',
  ProviderType.GOOGLE_DRIVE,
);

interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
}

interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
}

export class GoogleDriveProvider implements OAuthProvider {
  private readonly oauth2Client: OAuth2Client;
  private driveClient: drive_v3.Drive;

  constructor(private readonly config: GoogleDriveConfig) {
    this.oauth2Client = this.initializeOAuthClient();
    this.driveClient = this.initializeDriveClient();
    this.setupInitialCredentials();
  }

  // Authentication Methods
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

    return this.mapTokensToAuthToken({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type || undefined,
    });
  }

  async setCredentials(credentials: Record<string, string>) {
    const parsedCreds = this.validateCredentialsSchema(
      credentials as unknown as GoogleDriveCredentials,
    );

    this.oauth2Client.setCredentials({
      refresh_token: parsedCreds.refreshToken,
      access_token: parsedCreds.accessToken,
      expiry_date: parsedCreds.expiryDate,
    });

    this.driveClient = this.initializeDriveClient();

    return Promise.resolve();
  }

  async validateCredentials(): Promise<boolean> {
    const currentDate = Date.now();
    const expiryDate = this.oauth2Client.credentials.expiry_date;

    if (expiryDate && expiryDate < currentDate) {
      if (this.config.refreshToken) {
        await this.refreshAccessToken(this.config.refreshToken);
      } else {
        throw new Error('Refresh token not found');
      }
    }

    return true;
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error('Failed to refresh access token');
    }

    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
    });

    return this.mapTokensToAuthToken({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || undefined,
      expiry_date: credentials.expiry_date,
      token_type: credentials.token_type || undefined,
    });
  }

  // User Information Methods
  async getUserInfo() {
    const response = await this.driveClient.about.get({
      fields: 'user',
    });

    return {
      name: response.data.user?.displayName || undefined,
      email: response.data.user?.emailAddress || undefined,
    };
  }

  // File Operations Methods
  async listFiles(path = '/'): Promise<ProviderFile[]> {
    const query = this.buildFileQuery(path);
    const response = await this.driveClient.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, parents)',
    });

    return this.mapDriveFilesToProviderFiles(response.data.files || []);
  }

  async createFolder(name: string) {
    const folder = await this.driveClient.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    if (!folder.data.id) {
      throw new Error('Failed to create folder');
    }

    return {
      id: folder.data.id,
      name,
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

    if (!folder.data.id) {
      throw new Error('Failed to create folder');
    }

    return folder.data.id;
  }

  async hasFolder(id: string): Promise<boolean> {
    try {
      await this.driveClient.files.get({ fileId: id });
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(folderId: string, file: Express.Multer.File) {
    const fileStream = this.createFileStream(file.buffer);
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
      { responseType: 'stream' },
    );

    if (!response.data) {
      throw new Error('Failed to download file');
    }

    return response.data;
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
    await this.driveClient.files.delete({ fileId });
    return true;
  }

  // Private Helper Methods
  private initializeOAuthClient(): OAuth2Client {
    return new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
      redirectUri,
    );
  }

  private initializeDriveClient(): drive_v3.Drive {
    return google.drive({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  private setupInitialCredentials(): void {
    if (
      this.config.refreshToken &&
      this.config.accessToken &&
      this.config.expiryDate
    ) {
      this.oauth2Client.setCredentials({
        refresh_token: this.config.refreshToken,
        access_token: this.config.accessToken,
        expiry_date: this.config.expiryDate,
      });
    }
  }

  private validateCredentialsSchema(
    credentials: GoogleDriveCredentials,
  ): GoogleDriveCredentials {
    return z
      .object({
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        expiryDate: z.number().optional(),
      })
      .parse(credentials);
  }

  private mapTokensToAuthToken(tokens: GoogleTokens): AuthToken {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      tokenType: tokens.token_type,
    };
  }

  private buildFileQuery(path: string): string {
    return path !== '/' ? `'${path}' in parents` : "'root' in parents";
  }

  private mapDriveFilesToProviderFiles(
    files: drive_v3.Schema$File[],
  ): ProviderFile[] {
    return files.map((file) => ({
      id: file.id || '',
      name: file.name || '',
      size: file.size ? Number(file.size) : 0,
      type: file.mimeType || '',
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));
  }

  private createFileStream(buffer: Buffer): Readable {
    const fileStream = new Readable();
    fileStream.push(buffer);
    fileStream.push(null);
    return fileStream;
  }
}
