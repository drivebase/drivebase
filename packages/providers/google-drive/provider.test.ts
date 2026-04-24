import { describe, expect, test } from "bun:test";
import { GoogleDriveProvider } from "./provider.ts";
import { AuthError, NotFoundError, RateLimitError } from "@drivebase/storage";
import { asFetch } from "./test-helpers.ts";

/**
 * Tests stub `fetch` at the boundary. The provider composes `DriveHttp`
 * + `TokenStore`, so we also verify the 401 retry path and error
 * translation through the whole stack.
 */

type Call = { url: string; init?: RequestInit };

function makeFetch(
  script: Array<(call: Call) => Response | Promise<Response>>,
) {
  const calls: Call[] = [];
  let i = 0;
  const fetchImpl = asFetch(async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const call: Call = { url, init };
    calls.push(call);
    const step = script[i++];
    if (!step) throw new Error(`unscripted fetch: ${url}`);
    return step(call);
  });
  return { fetchImpl, calls };
}

function freshProvider(fetchImpl: typeof fetch) {
  return new GoogleDriveProvider({
    tokens: {
      accessToken: "at",
      refreshToken: "rt",
      expiresAt: Date.now() + 60 * 60_000,
    },
    oauthApp: () => ({ clientId: "cid", clientSecret: "sec" }),
    fetchImpl,
  });
}

describe("GoogleDriveProvider.listChildren", () => {
  test("builds the correct `q` and maps files to RemoteNode", async () => {
    const { fetchImpl, calls } = makeFetch([
      () =>
        new Response(
          JSON.stringify({
            files: [
              {
                id: "F1",
                name: "hello.txt",
                mimeType: "text/plain",
                size: "42",
                md5Checksum: "abc",
                parents: ["parent-1"],
                createdTime: "2024-01-01T00:00:00Z",
                modifiedTime: "2024-01-02T00:00:00Z",
              },
              {
                id: "D1",
                name: "sub",
                mimeType: "application/vnd.google-apps.folder",
                parents: ["parent-1"],
              },
            ],
            nextPageToken: "pg2",
          }),
          { status: 200 },
        ),
    ]);
    const p = freshProvider(fetchImpl);
    const res = await p.listChildren("parent-1");
    expect(calls[0]?.url).toContain(
      `q=%27parent-1%27+in+parents+and+trashed+%3D+false`,
    );
    expect(res.nextPageToken).toBe("pg2");
    expect(res.nodes).toHaveLength(2);
    expect(res.nodes[0]).toMatchObject({
      remoteId: "F1",
      name: "hello.txt",
      type: "file",
      size: 42,
      checksum: "abc",
      parentRemoteId: "parent-1",
    });
    expect(res.nodes[1]).toMatchObject({
      remoteId: "D1",
      type: "folder",
    });
  });

  test("listChildren(null) targets the drive root", async () => {
    const { fetchImpl, calls } = makeFetch([
      () =>
        new Response(JSON.stringify({ files: [] }), { status: 200 }),
    ]);
    const p = freshProvider(fetchImpl);
    await p.listChildren(null);
    expect(calls[0]?.url).toContain(`q=%27root%27+in+parents`);
  });
});

describe("GoogleDriveProvider error translation", () => {
  test("404 → NotFoundError", async () => {
    const { fetchImpl } = makeFetch([
      () => new Response("gone", { status: 404 }),
    ]);
    const p = freshProvider(fetchImpl);
    await expect(p.getMetadata("id-x")).rejects.toBeInstanceOf(NotFoundError);
  });

  test("403 → AuthError", async () => {
    const { fetchImpl } = makeFetch([
      // first attempt: 403 (we only retry on 401)
      () => new Response("forbidden", { status: 403 }),
    ]);
    const p = freshProvider(fetchImpl);
    await expect(p.getMetadata("id-x")).rejects.toBeInstanceOf(AuthError);
  });

  test("429 → RateLimitError with retryAfterMs", async () => {
    const { fetchImpl } = makeFetch([
      () =>
        new Response("slow down", {
          status: 429,
          headers: { "retry-after": "3" },
        }),
    ]);
    const p = freshProvider(fetchImpl);
    const err = await p.getMetadata("id-x").catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfterMs).toBe(3000);
  });

  test("401 triggers forceRefresh and retries", async () => {
    // script:
    //   1) GET /files/X → 401
    //   2) POST /token (refresh) → fresh token (goes through globalThis.fetch)
    //   3) GET /files/X → 200
    //
    // `googleDriveOAuth.refreshToken` uses `globalThis.fetch` directly, so
    // we stub both the injected fetchImpl (for DriveHttp) and the global
    // fetch (for the refresh roundtrip). Same script drives both.
    const { fetchImpl, calls } = makeFetch([
      () => new Response("expired", { status: 401 }),
      () =>
        new Response(
          JSON.stringify({ access_token: "at-new", expires_in: 3600 }),
          { status: 200 },
        ),
      () =>
        new Response(
          JSON.stringify({
            id: "id-x",
            name: "file",
            mimeType: "text/plain",
            parents: ["root"],
          }),
          { status: 200 },
        ),
    ]);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchImpl;
    try {
      const p = freshProvider(fetchImpl);
      const node = await p.getMetadata("id-x");
      expect(node.remoteId).toBe("id-x");
      // third call (the retry GET) carries the refreshed bearer
      const authHeader = new Headers(calls[2]?.init?.headers).get(
        "authorization",
      );
      expect(authHeader).toBe("Bearer at-new");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("GoogleDriveProvider.createFolder / copy / delete", () => {
  test("createFolder posts the folder mime type", async () => {
    const { fetchImpl, calls } = makeFetch([
      () =>
        new Response(
          JSON.stringify({
            id: "NEW",
            name: "docs",
            mimeType: "application/vnd.google-apps.folder",
            parents: ["root"],
          }),
          { status: 200 },
        ),
    ]);
    const p = freshProvider(fetchImpl);
    const node = await p.createFolder(null, "docs");
    expect(node.type).toBe("folder");
    const body = JSON.parse(String(calls[0]?.init?.body ?? "{}"));
    expect(body.mimeType).toBe("application/vnd.google-apps.folder");
    expect(body.parents).toEqual(["root"]);
  });

  test("delete throws NotFoundError on 404", async () => {
    const { fetchImpl } = makeFetch([
      () => new Response("gone", { status: 404 }),
    ]);
    const p = freshProvider(fetchImpl);
    await expect(p.delete("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("GoogleDriveProvider.getUsage", () => {
  test("computes `available` from limit + usage", async () => {
    const { fetchImpl } = makeFetch([
      () =>
        new Response(
          JSON.stringify({
            storageQuota: { limit: "1000", usage: "300", usageInDrive: "200" },
          }),
          { status: 200 },
        ),
    ]);
    const p = freshProvider(fetchImpl);
    const u = await p.getUsage();
    expect(u.total).toBe(1000);
    expect(u.used).toBe(300);
    expect(u.available).toBe(700);
  });

  test("returns empty snapshot when storageQuota absent", async () => {
    const { fetchImpl } = makeFetch([
      () => new Response(JSON.stringify({}), { status: 200 }),
    ]);
    const p = freshProvider(fetchImpl);
    expect(await p.getUsage()).toEqual({});
  });
});

describe("GoogleDriveProvider.move", () => {
  test("fetches current parents then PATCHes add/removeParents", async () => {
    const { fetchImpl, calls } = makeFetch([
      // GET parents
      () =>
        new Response(JSON.stringify({ parents: ["old-1", "old-2"] }), {
          status: 200,
        }),
      // PATCH with add/removeParents
      () =>
        new Response(
          JSON.stringify({
            id: "F1",
            name: "renamed.txt",
            mimeType: "text/plain",
            parents: ["new-parent"],
          }),
          { status: 200 },
        ),
    ]);
    const p = freshProvider(fetchImpl);
    const node = await p.move("F1", "new-parent", "renamed.txt");
    expect(node.name).toBe("renamed.txt");

    const patchUrl = calls[1]?.url ?? "";
    expect(patchUrl).toContain("addParents=new-parent");
    // URLSearchParams encodes commas — `old-1,old-2` becomes `old-1%2Colds-2`
    expect(patchUrl).toContain("removeParents=old-1%2Cold-2");
    expect(calls[1]?.init?.method).toBe("PATCH");
  });
});
