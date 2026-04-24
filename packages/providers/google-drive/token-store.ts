import { AuthError } from "@drivebase/storage";
import { googleDriveOAuth } from "./oauth.ts";

/**
 * Credentials the provider holds in-memory. Access token can be refreshed
 * transparently, so we keep them mutable inside the store.
 */
export type DriveTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type OAuthAppCreds = {
  clientId: string;
  clientSecret: string;
};

/**
 * A callback invoked whenever we successfully refresh the access token.
 * The API layer passes one that persists the new token back into
 * `providers.credentials`, so the next process to load the row sees the
 * fresh token instead of hammering Google on every boot.
 *
 * Kept optional because test suites and probe-only calls don't care.
 */
export type PersistFn = (next: DriveTokens) => Promise<void> | void;

/**
 * Minimal lookup the provider does to resolve `clientId` / `clientSecret`
 * for refresh calls. In production this reaches into the DB via the
 * OAuth apps table; in tests a plain object suffices.
 */
export type OAuthAppLookup = () => Promise<OAuthAppCreds> | OAuthAppCreds;

/**
 * Treat a token as expired 60s before its real deadline so we never hand
 * Drive a token that will expire mid-request.
 */
const EXPIRY_SKEW_MS = 60_000;

export class TokenStore {
  private tokens: DriveTokens;
  private inflight: Promise<string> | null = null;

  constructor(
    initial: DriveTokens,
    private readonly app: OAuthAppLookup,
    private readonly persist?: PersistFn,
  ) {
    this.tokens = { ...initial };
  }

  snapshot(): DriveTokens {
    return { ...this.tokens };
  }

  /**
   * Return a non-expired access token. Refreshes on demand if the current
   * one is within 60s of expiry. Concurrent callers share one in-flight
   * refresh via `inflight` so we never burn two refresh_token swaps racing.
   */
  async getAccessToken(): Promise<string> {
    if (!this.isExpired()) return this.tokens.accessToken;
    if (!this.tokens.refreshToken) {
      throw new AuthError(
        "google drive access token expired and no refresh_token available",
      );
    }
    if (this.inflight) return this.inflight;
    this.inflight = this.doRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /**
   * Force a refresh — called from 401 retry paths where Drive says the
   * token is invalid even though our expiry math thinks it's alive.
   */
  async forceRefresh(): Promise<string> {
    if (!this.tokens.refreshToken) {
      throw new AuthError(
        "google drive 401 but no refresh_token available",
      );
    }
    this.tokens.expiresAt = 0;
    return this.getAccessToken();
  }

  private isExpired(): boolean {
    // `undefined` means "no expiry info" — we trust the token until a 401
    // proves otherwise. `0` is the sentinel `forceRefresh` uses to demand
    // a refresh; anything else is a normal absolute-ms deadline.
    if (this.tokens.expiresAt === undefined) return false;
    return Date.now() > this.tokens.expiresAt - EXPIRY_SKEW_MS;
  }

  private async doRefresh(): Promise<string> {
    const { refreshToken } = this.tokens;
    if (!refreshToken) throw new AuthError("no refresh_token");
    const app = await this.app();
    const next = await googleDriveOAuth.refreshToken({
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      refreshToken,
    });
    this.tokens = {
      accessToken: next.accessToken,
      refreshToken,
      expiresAt: next.expiresAt,
    };
    if (this.persist) await this.persist(this.snapshot());
    return this.tokens.accessToken;
  }
}
