import { AuthError, type OAuthProviderModule } from "@drivebase/storage";

/**
 * Google Drive OAuth 2.0 scopes. `drive.file` would be safer (access only
 * to files the app created) but doesn't cover migrations into existing
 * folders or reading pre-existing content. `drive` gives full access;
 * users opt in explicitly at connect time.
 */
export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  // userinfo.email is needed so we can label the connected account.
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

/**
 * Build the full Google consent URL. `access_type=offline` asks Google to
 * mint a refresh_token; `prompt=consent` forces re-consent so a returning
 * user actually gets a refresh_token back (Google omits it on subsequent
 * consents by default — a classic footgun).
 */
function buildAuthorizeUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: args.state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCode(args: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}> {
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
      `google token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    // `expires_in` is seconds-from-now; bake it into an absolute ms timestamp
    // so the provider can check expiry without care for the clock skew of
    // whichever process loads the creds.
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
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new AuthError(
      `google token refresh failed: ${res.status} ${await res.text()}`,
    );
  }
  const json = (await res.json()) as TokenResponse;
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export const googleDriveOAuth: OAuthProviderModule = {
  scopes: DRIVE_SCOPES,
  buildAuthorizeUrl,
  exchangeCode,
  refreshToken,
};
