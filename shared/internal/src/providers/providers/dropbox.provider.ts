import {
  AuthMethod,
  AuthToken,
  Provider,
  ProviderConfig,
} from '../provider.interface';

export class DropboxProvider implements Provider {
  private accessToken?: string;

  constructor(public config: ProviderConfig) {
    if (config.authMethod !== AuthMethod.OAuth2 || !config.oauthConfig) {
      throw new Error('Dropbox requires OAuth2 authentication');
    }
  }

  getAuthUrl(state?: string): string {
    if (!this.config.oauthConfig) {
      throw new Error('OAuth config is required');
    }

    const authUrl = 'https://www.dropbox.com/oauth2/authorize';

    const params = new URLSearchParams({
      client_id: this.config.oauthConfig.clientId,
      response_type: 'code',
      redirect_uri: this.config.oauthConfig.redirectUri,
      token_access_type: 'offline',
      state: state || '',
      scope: this.config.oauthConfig.scopes.join(' '),
    });

    return `${authUrl}?${params.toString()}`;
  }

  async getAccessToken(code: string): Promise<AuthToken> {
    if (!this.config.oauthConfig) {
      throw new Error('OAuth config is required');
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.config.oauthConfig.clientId,
        client_secret: this.config.oauthConfig.clientSecret,
        redirect_uri: this.config.oauthConfig.redirectUri,
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
    if (!this.config.oauthConfig) {
      throw new Error('OAuth config is required');
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.config.oauthConfig.clientId,
        client_secret: this.config.oauthConfig.clientSecret,
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

  async uploadFile(path: string, file: Blob) {
    const arrayBuffer = await file.arrayBuffer();
    const response = await fetch(
      'https://content.dropboxapi.com/2/files/upload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: `${path}/${file.name}`,
            mode: 'add',
            autorename: true,
            mute: false,
          }),
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.from(arrayBuffer),
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
