import { AuthToken, OAuthProvider, OAuthConfig } from '../provider.interface';

export class DropboxProvider implements OAuthProvider {
  private accessToken?: string;

  constructor(public config: OAuthConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error('Dropbox requires OAuth2 authentication');
    }
  }

  setCredentials(credentials: Record<string, string>): void {
    this.accessToken = credentials['access_token'];
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
      redirect_uri: `${process.env['NEXT_PUBLIC_APP_URL']}/providers/callback`,
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
      expiresIn: result.expires_in,
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
      expiresIn: result.expires_in,
      tokenType: result.token_type,
    };
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

  async uploadFile(path: string, file: Express.Multer.File) {
    const response = await fetch(
      'https://content.dropboxapi.com/2/files/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: `${path}/${file.originalname}`,
            mode: 'add',
            autorename: true,
            mute: false,
          }),
          'Content-Type': 'application/octet-stream',
        },
        body: file.buffer,
      }
    );
    return response.json();
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
