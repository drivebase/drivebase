import { describe, expect, test } from "bun:test";
import { TokenStore } from "./token-store.ts";
import { asFetch } from "./test-helpers.ts";

/**
 * The TokenStore is pure enough that we can exercise every branch without
 * touching Google. We pass a stub OAuthAppLookup and spy on `persist`.
 *
 * The one exception is `doRefresh` which internally calls
 * `googleDriveOAuth.refreshToken` (fetch). We stub `globalThis.fetch` for
 * those cases.
 */

function fakeApp() {
  return { clientId: "cid", clientSecret: "sec" };
}

describe("TokenStore", () => {
  test("returns current token when not expired", async () => {
    const store = new TokenStore(
      { accessToken: "at", expiresAt: Date.now() + 10 * 60_000 },
      fakeApp,
    );
    expect(await store.getAccessToken()).toBe("at");
  });

  test("refreshes and calls persist when expired", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = asFetch(async () =>
      new Response(
        JSON.stringify({ access_token: "at-new", expires_in: 3600 }),
        { status: 200 },
      ),
    );

    const persisted: unknown[] = [];
    try {
      const store = new TokenStore(
        {
          accessToken: "at-old",
          refreshToken: "rt",
          // 30s from now < 60s skew → counts as expired
          expiresAt: Date.now() + 30_000,
        },
        fakeApp,
        (next) => {
          persisted.push(next);
        },
      );
      expect(await store.getAccessToken()).toBe("at-new");
      expect(persisted.length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("concurrent callers share one inflight refresh", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = asFetch(async () => {
      fetchCalls++;
      // simulate network delay so concurrent calls race the refresh
      await Bun.sleep(20);
      return new Response(
        JSON.stringify({ access_token: "at-new", expires_in: 3600 }),
        { status: 200 },
      );
    });
    try {
      const store = new TokenStore(
        { accessToken: "at-old", refreshToken: "rt", expiresAt: 1 },
        fakeApp,
      );
      const [a, b, c] = await Promise.all([
        store.getAccessToken(),
        store.getAccessToken(),
        store.getAccessToken(),
      ]);
      expect([a, b, c]).toEqual(["at-new", "at-new", "at-new"]);
      // Critical invariant: only one refresh_token swap even under races.
      expect(fetchCalls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws AuthError when expired with no refresh_token", async () => {
    const store = new TokenStore(
      { accessToken: "at", expiresAt: 1 }, // no refreshToken
      fakeApp,
    );
    await expect(store.getAccessToken()).rejects.toThrow(
      /no refresh_token available/,
    );
  });

  test("forceRefresh re-fetches even when not expired", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = asFetch(async () => {
      fetchCalls++;
      return new Response(
        JSON.stringify({ access_token: "at-new", expires_in: 3600 }),
        { status: 200 },
      );
    });
    try {
      const store = new TokenStore(
        {
          accessToken: "at",
          refreshToken: "rt",
          expiresAt: Date.now() + 10 * 60_000,
        },
        fakeApp,
      );
      const got = await store.forceRefresh();
      expect(got).toBe("at-new");
      expect(fetchCalls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
