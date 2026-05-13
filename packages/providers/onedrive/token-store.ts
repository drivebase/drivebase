import { AuthError } from "@drivebase/storage";
import { oneDriveOAuth } from "./oauth.ts";

export type OneDriveTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type OAuthAppCreds = {
  clientId: string;
  clientSecret: string;
};

export type PersistFn = (next: OneDriveTokens) => Promise<void> | void;
export type OAuthAppLookup = () => Promise<OAuthAppCreds> | OAuthAppCreds;

const EXPIRY_SKEW_MS = 60_000;

export class TokenStore {
  private tokens: OneDriveTokens;
  private inflight: Promise<string> | null = null;

  constructor(
    initial: OneDriveTokens,
    private readonly app: OAuthAppLookup,
    private readonly persist?: PersistFn,
  ) {
    this.tokens = { ...initial };
  }

  snapshot(): OneDriveTokens {
    return { ...this.tokens };
  }

  async getAccessToken(): Promise<string> {
    if (!this.isExpired()) return this.tokens.accessToken;
    if (!this.tokens.refreshToken) {
      throw new AuthError(
        "onedrive access token expired and no refresh_token available",
      );
    }
    if (this.inflight) return this.inflight;
    this.inflight = this.doRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  async forceRefresh(): Promise<string> {
    if (!this.tokens.refreshToken) {
      throw new AuthError("onedrive 401 but no refresh_token available");
    }
    this.tokens.expiresAt = 0;
    return this.getAccessToken();
  }

  private isExpired(): boolean {
    if (this.tokens.expiresAt === undefined) return false;
    return Date.now() > this.tokens.expiresAt - EXPIRY_SKEW_MS;
  }

  private async doRefresh(): Promise<string> {
    const { refreshToken } = this.tokens;
    if (!refreshToken) throw new AuthError("no refresh_token");
    const app = await this.app();
    const next = await oneDriveOAuth.refreshToken({
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
