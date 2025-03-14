import { ProviderType } from '@prisma/client';
import {
  AuthToken,
  OAuthProvider,
  OAuthConfig,
  OAUTH_REDIRECT_URI,
} from '../provider.interface';

const redirectUri = OAUTH_REDIRECT_URI.replace('[type]', ProviderType.DROPBOX);
const drivebaseFolderName = process.env['DRIVEBASE_FOLDER_NAME'];

export class DropboxProvider implements OAuthProvider {
  private accessToken?: string;

  constructor(public config: OAuthConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Dropbox requires OAuth2 authentication');
    }
  }

  async getUserInfo(): Promise<any> {
    const response = await fetch(
      'https://api.dropboxapi.com/2/users/get_current_account',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    const json = await response.json();

    return {
      id: json.account_id,
      name: json.name.display_name,
      email: json.email,
    };
  }

  async setCredentials(credentials: Record<string, string>) {
    this.accessToken = credentials['accessToken'];
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
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
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
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    if (!result.access_token) {
      throw new Error('Failed to get access token');
    }

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiryDate: new Date().getTime() + result.expires_in * 1000,
      tokenType: result.token_type,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
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
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    if (!result.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token || refreshToken,
      tokenType: result.token_type,
      expiryDate: new Date().getTime() + result.expires_in * 1000,
    };
  }

  async createFolder(name: string) {
    const response = await fetch(
      'https://api.dropboxapi.com/2/files/create_folder_v2',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: name,
          autorename: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create folder');
    }

    const json = await response.json();

    return {
      id: json.metadata.id,
      name: json.metadata.name,
      path: json.metadata.path_display,
    };
  }

  async createDrivebaseFolder() {
    const response = await fetch(
      'https://api.dropboxapi.com/2/files/create_folder_v2',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: `/${process.env['DRIVEBASE_FOLDER_NAME']}`,
          autorename: false,
        }),
      }
    );

    const json = await response.json();

    if (!response.ok) {
      throw new Error('Failed to create folder');
    }

    return json.metadata.id;
  }

  async hasFolder(id: string): Promise<boolean> {
    const response = await fetch(
      'https://api.dropboxapi.com/2/files/get_metadata',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: id,
        }),
      }
    );

    return response.ok;
  }

  async listFiles(path?: string) {
    const response = await fetch(
      'https://api.dropboxapi.com/2/files/list_folder',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: path || '',
          include_media_info: true,
        }),
      }
    );
    const result = (await response.json()) as {
      entries: unknown[];
    };
    return result.entries;
  }

  async uploadFile(folderId: string, file: Express.Multer.File) {
    const response = await fetch(
      'https://content.dropboxapi.com/2/files/upload',
      {
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
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const json = await response.json();

    return json.id;
  }

  async downloadFile(path: string): Promise<Blob> {
    const response = await fetch(
      'https://content.dropboxapi.com/2/files/download',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path,
          }),
        },
      }
    );
    return await response.blob();
  }

  async deleteFile(path: string): Promise<boolean> {
    await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
      }),
    });
    return true;
  }
}
