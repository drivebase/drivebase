import { describe, expect, test } from "bun:test";
import { googleDriveOAuth, DRIVE_SCOPES } from "./oauth.ts";
import { asFetch } from "./test-helpers.ts";

describe("googleDriveOAuth.buildAuthorizeUrl", () => {
  test("includes required params and scopes", () => {
    const url = googleDriveOAuth.buildAuthorizeUrl({
      clientId: "client-xyz",
      redirectUri: "https://app.example/oauth/callback",
      state: "nonce-123",
    });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(u.searchParams.get("client_id")).toBe("client-xyz");
    expect(u.searchParams.get("redirect_uri")).toBe(
      "https://app.example/oauth/callback",
    );
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("access_type")).toBe("offline");
    // prompt=consent forces Google to return a refresh_token on every
    // consent — a common Drive OAuth pitfall otherwise.
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(u.searchParams.get("state")).toBe("nonce-123");
    expect(u.searchParams.get("scope")).toBe(DRIVE_SCOPES.join(" "));
  });
});

describe("googleDriveOAuth.exchangeCode / refreshToken", () => {
  test("exchangeCode bakes an absolute expiresAt", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = asFetch(async () =>
      new Response(
        JSON.stringify({
          access_token: "at-1",
          refresh_token: "rt-1",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        { status: 200 },
      ),
    );
    try {
      const before = Date.now();
      const got = await googleDriveOAuth.exchangeCode({
        clientId: "c",
        clientSecret: "s",
        redirectUri: "r",
        code: "auth-code",
      });
      expect(got.accessToken).toBe("at-1");
      expect(got.refreshToken).toBe("rt-1");
      // absolute ms timestamp in the future
      expect(got.expiresAt).toBeGreaterThan(before + 3500_000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("refreshToken throws AuthError on non-2xx", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = asFetch(async () =>
      new Response("invalid_grant", { status: 400 }),
    );
    try {
      await expect(
        googleDriveOAuth.refreshToken({
          clientId: "c",
          clientSecret: "s",
          refreshToken: "rt",
        }),
      ).rejects.toThrow(/google token refresh failed/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
