import { ProviderType } from '@prisma/client';
import { Readable } from 'stream';
import { z } from 'zod';

import {
  AuthToken,
  OAUTH_REDIRECT_URI,
  OAuthProvider,
  ProviderFile,
} from '../provider.interface';

// Dropbox API Response Types
interface DropboxUserInfo {
  account_id: string;
  name: {
    display_name: string;
  };
  email: string;
}

interface DropboxFolderMetadata {
  id: string;
  name: string;
  path_display: string;
}

interface DropboxCreateFolderResponse {
  metadata: DropboxFolderMetadata;
}

interface DropboxListFolderEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  media_info?: {
    metadata: {
      mime_type: string;
    };
  };
}

interface DropboxListFolderResponse {
  entries: DropboxListFolderEntry[];
}

interface DropboxFileMetadata {
  id: string;
  name: string;
  size: number;
  path: string;
  media_info: {
    metadata: {
      mime_type: string;
    };
  };
  path_display: string;
}

interface DropboxUploadResponse {
  id: string;
  name: string;
  path_display: string;
}

interface DropboxError {
  error: {
    '.tag': string;
    error?: string;
    error_summary: string;
  };
}

const redirectUri = OAUTH_REDIRECT_URI.replace('[type]', ProviderType.DROPBOX);
const drivebaseFolderName = process.env['DRIVEBASE_FOLDER_NAME'];

const dropboxConfigSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiryDate: z.number().optional(),
});

type DropboxConfig = z.infer<typeof dropboxConfigSchema>;

export class DropboxProvider implements OAuthProvider {
  private accessToken?: string;
  private config: DropboxConfig;
  private readonly API_URL = 'https://api.dropboxapi.com';
  private readonly CONTENT_API_URL = 'https://content.dropboxapi.com';

  constructor(config: Record<string, string>) {
    this.config = dropboxConfigSchema.parse(config);

    if (this.config.accessToken) {
      this.accessToken = this.config.accessToken;
    }
  }

  // Authentication methods
  async setCredentials(credentials: Record<string, string>): Promise<void> {
    this.accessToken = credentials['accessToken'];
    return Promise.resolve();
  }

  async validateCredentials(): Promise<boolean> {
    return Promise.resolve(!!this.accessToken);
  }

  getAuthUrl(state?: string): string {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Dropbox requires OAuth2 authentication');
    }

    const authUrl = 'https://www.dropbox.com/oauth2/authorize';
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      token_access_type: 'offline',
      state: state || '',
      redirect_uri: redirectUri,
    });

    return `${authUrl}?${params.toString()}`;
  }

  async getAccessToken(code: string): Promise<AuthToken> {
    const response = await fetch(`${this.API_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const result = (await response.json()) as {
      access_token?: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    if (!response.ok || !result.access_token) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiryDate: new Date().getTime() + result.expires_in * 1000,
      tokenType: result.token_type,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    const response = await fetch(`${this.API_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    const result = (await response.json()) as {
      access_token?: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    if (!response.ok || !result.access_token) {
      throw new Error(`Failed to refresh access token: ${response.statusText}`);
    }

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token || refreshToken,
      tokenType: result.token_type,
      expiryDate: new Date().getTime() + result.expires_in * 1000,
    };
  }

  // User methods
  async getUserInfo() {
    const response = await this.apiRequest<DropboxUserInfo>(
      `${this.API_URL}/2/users/get_current_account`,
      {
        method: 'POST',
      },
    );

    return {
      id: response.account_id,
      name: response.name.display_name,
      email: response.email,
    };
  }

  // Folder operations
  async createFolder(name: string) {
    const response = await this.apiRequest<DropboxCreateFolderResponse>(
      `${this.API_URL}/2/files/create_folder_v2`,
      {
        method: 'POST',
        body: JSON.stringify({
          path: name,
          autorename: false,
        }),
      },
    );

    return {
      id: response.metadata.id,
      name: response.metadata.name,
      path: response.metadata.path_display,
    };
  }

  async createDrivebaseFolder() {
    try {
      const response = await this.apiRequest<DropboxCreateFolderResponse>(
        `${this.API_URL}/2/files/create_folder_v2`,
        {
          method: 'POST',
          body: JSON.stringify({
            path: `/${drivebaseFolderName}`,
            autorename: false,
          }),
        },
      );

      return response.metadata.id;
    } catch (error: any) {
      if (error.message && error.message.includes('path/conflict')) {
        const listResponse = await this.listFiles();
        const drivebaseFolder = listResponse.find(
          (f) => f.name === drivebaseFolderName && f.isFolder,
        );
        if (drivebaseFolder) {
          return drivebaseFolder.id;
        }
      }

      throw error;
    }
  }

  async hasFolder(id: string): Promise<boolean> {
    try {
      await this.apiRequest<DropboxFolderMetadata>(
        `${this.API_URL}/2/files/get_metadata`,
        {
          method: 'POST',
          body: JSON.stringify({
            path: id,
          }),
        },
      );
      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Log the error for debugging purposes
        console.debug(`Failed to check folder existence: ${error.message}`);
      }
      return false;
    }
  }

  // File operations
  async listFiles(path?: string): Promise<ProviderFile[]> {
    const response = await this.apiRequest<DropboxListFolderResponse>(
      `${this.API_URL}/2/files/list_folder`,
      {
        method: 'POST',
        body: JSON.stringify({
          path: path || '',
          include_media_info: true,
        }),
      },
    );

    return response.entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      size: entry.size,
      type: entry.type,
      isFolder: entry.type === 'folder',
    }));
  }

  async uploadFile(folderId: string, file: Express.Multer.File) {
    const response = await fetch(`${this.CONTENT_API_URL}/2/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: `/${drivebaseFolderName}/${file.originalname}`,
          mode: 'add',
          autorename: false,
          mute: true,
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: file.buffer,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const json = (await response.json()) as DropboxUploadResponse;
    return json.id;
  }

  async getFileMetadata(fileId: string) {
    const response = await this.apiRequest<DropboxFileMetadata>(
      `${this.API_URL}/2/files/get_metadata`,
      {
        method: 'POST',
        body: JSON.stringify({
          path: fileId,
          include_media_info: true,
        }),
      },
    );

    return {
      id: response.id,
      name: response.name,
      size: response.size,
      mimeType:
        response.media_info?.metadata?.mime_type || 'application/octet-stream',
      path: response.path_display,
    };
  }

  async downloadFile(path: string): Promise<Readable> {
    const response = await fetch(`${this.CONTENT_API_URL}/2/files/download`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const readable = new Readable();
    readable.push(Buffer.from(buffer));
    readable.push(null);

    return readable;
  }

  async deleteFile(path: string): Promise<boolean> {
    await this.apiRequest(`${this.API_URL}/2/files/delete_v2`, {
      method: 'POST',
      body: JSON.stringify({
        path,
      }),
    });
    return true;
  }

  // Helper methods
  private async apiRequest<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 && this.config.refreshToken) {
        const authToken = await this.refreshAccessToken(
          this.config.refreshToken,
        );
        this.accessToken = authToken.accessToken;

        return this.apiRequest<T>(url, options);
      }

      const errorText = await response.text();
      let errorMessage = `Dropbox API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText) as DropboxError;
        errorMessage += ` - ${errorJson.error.error_summary}`;
      } catch {
        errorMessage += ` - ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }
}
