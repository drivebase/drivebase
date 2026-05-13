import { AuthError, type OAuthProviderModule } from "@drivebase/storage";

export const ONEDRIVE_SCOPES = [
  "Files.ReadWrite",
  "offline_access",
  "User.Read",
];

const AUTHORIZE_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
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
    scope: ONEDRIVE_SCOPES.join(" "),
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
    scope: ONEDRIVE_SCOPES.join(" "),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new AuthError(
      `onedrive token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
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
    scope: ONEDRIVE_SCOPES.join(" "),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new AuthError(
      `onedrive token refresh failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export const oneDriveOAuth: OAuthProviderModule = {
  scopes: ONEDRIVE_SCOPES,
  buildAuthorizeUrl,
  exchangeCode,
  refreshToken,
};
