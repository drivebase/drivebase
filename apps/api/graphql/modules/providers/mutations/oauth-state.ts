import type { AppConfig } from "@drivebase/config";

export const OAUTH_STATE_TTL_SECONDS = 600;

export function oauthStateKey(state: string): string {
  return `oauth:state:${state}`;
}

/**
 * Server-derived OAuth redirect URI. Every provider uses the same path;
 * operators register this exact value in the OAuth app's console (Google
 * Cloud, Dropbox, etc.). Deriving it server-side avoids open-redirect
 * risk from client-supplied URIs.
 */
export function buildRedirectUri(config: AppConfig): string {
  const base = config.auth.baseUrl.replace(/\/+$/, "");
  return `${base}/oauth/callback`;
}

/** Payload we stash in Redis under oauth:state:<state>. */
export type OAuthStateStash = {
  userId: string;
  oauthAppId: string;
  redirectUri: string;
  label: string;
  providerType: string;
};
