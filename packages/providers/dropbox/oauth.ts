import { AuthError, type OAuthProviderModule } from "@drivebase/storage";

export const DROPBOX_SCOPES = [
  "account_info.read",
  "files.metadata.read",
  "files.metadata.write",
  "files.content.read",
  "files.content.write",
];

const AUTHORIZE_URL = "https://www.dropbox.com/oauth2/authorize";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

function buildAuthorizeUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: "code",
    token_access_type: "offline",
    state: args.state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCode(args: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number }> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
    grant_type: "authorization_code",
    code: args.code,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new AuthError(
      `dropbox token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt:
      json.expires_in != null
        ? Date.now() + json.expires_in * 1000
        : undefined,
  };
}

async function refreshToken(args: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ accessToken: string; expiresAt?: number }> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new AuthError(
      `dropbox token refresh failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    expiresAt:
      json.expires_in != null
        ? Date.now() + json.expires_in * 1000
        : undefined,
  };
}

export const dropboxOAuth: OAuthProviderModule = {
  scopes: DROPBOX_SCOPES,
  buildAuthorizeUrl,
  exchangeCode,
  refreshToken,
};
