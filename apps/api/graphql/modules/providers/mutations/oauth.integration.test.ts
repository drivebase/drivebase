import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { execute, parse } from "graphql";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { createLogger } from "@drivebase/logger";
import { schema as dbSchema } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import {
  connectRedis,
  startPostgres,
  startRedis,
  type PostgresHarness,
  type RedisHarness,
} from "@drivebase/testing";
import {
  ProviderRegistry,
  encryptString,
  decryptJson,
  type IStorageProvider,
  type ProviderModule,
} from "@drivebase/storage";
import { buildSchema } from "~/graphql/schema.ts";
import { pubsub } from "~/pubsub.ts";
import type { GraphQLContext } from "~/graphql/context.ts";
import { CacheService } from "@drivebase/cache";
import { oauthStateKey, type OAuthStateStash } from "./oauth-state.ts";

/**
 * Covers the generic provider-agnostic OAuth flow end-to-end:
 *   beginProviderOAuth → Redis state stash → completeProviderOAuth.
 *
 * Uses a fake `ProviderModule` whose `exchangeCode` records its args and
 * returns deterministic tokens — no googleapis, no real network.
 */

const MASTER_KEY = Buffer.alloc(32).toString("base64");

let pg: PostgresHarness;
let redis: RedisHarness;
let primary: Redis;
let gqlSchema: Awaited<ReturnType<typeof buildSchema>>;
let userId: string;
let otherUserId: string;
let fakeAppId: string;
let otherUsersAppId: string;

let exchangeCalls: Array<Record<string, string>> = [];

beforeAll(async () => {
  [pg, redis] = await Promise.all([startPostgres(), startRedis()]);
  primary = await connectRedis(redis.url);
  gqlSchema = await buildSchema();

  const secret = await encryptString(MASTER_KEY, "fake-client-secret");

  const [u1, u2] = await pg.db
    .insert(dbSchema.user)
    .values([
      { id: "u_oauth_1", name: "A", email: "a@drivebase.local" },
      { id: "u_oauth_2", name: "B", email: "b@drivebase.local" },
    ])
    .returning();
  if (!u1 || !u2) throw new Error("user seed failed");
  userId = u1.id;
  otherUserId = u2.id;

  const [a1, a2] = await pg.db
    .insert(dbSchema.oauthApps)
    .values([
      {
        userId,
        provider: "fake",
        label: "fake-app",
        clientId: "fake-client-id",
        clientSecret: secret,
      },
      {
        userId: otherUserId,
        provider: "fake",
        label: "stranger-app",
        clientId: "stranger",
        clientSecret: secret,
      },
    ])
    .returning();
  if (!a1 || !a2) throw new Error("oauth app seed failed");
  fakeAppId = a1.id;
  otherUsersAppId = a2.id;
}, 180_000);

afterAll(async () => {
  await primary?.quit().catch(() => {});
  await Promise.allSettled([pg?.stop(), redis?.stop()]);
}, 60_000);

beforeEach(async () => {
  exchangeCalls = [];
  const keys = await primary.keys("oauth:state:*");
  if (keys.length) await primary.del(...keys);
});

function makeRegistry(): ProviderRegistry {
  const reg = new ProviderRegistry();
  const provider = {
    type: "fake",
    capabilities: {
      isHierarchical: true,
      supportsNativeCopy: false,
      supportsNativeMove: false,
      supportsDelta: false,
      supportsChecksum: false,
      supportsMultipartUpload: false,
      supportsPresignedUploadParts: false,
    },
    authenticate: async () => ({ metadataPatch: { probed: true } }),
    listChildren: async () => ({ nodes: [] }),
    getMetadata: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    download: async () => new ReadableStream<Uint8Array>(),
    upload: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    createFolder: async () => ({ remoteId: "", name: "", type: "folder" as const, parentRemoteId: null }),
    move: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    copy: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    delete: async () => {},
    getUsage: async () => ({}),
  } satisfies IStorageProvider;

  const mod: ProviderModule = {
    type: "fake",
    label: "Fake",
    authKind: "oauth",
    oauth: {
      scopes: ["fake.scope"],
      buildAuthorizeUrl: ({ clientId, redirectUri, state }) =>
        `https://fake.example.com/a?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      exchangeCode: async (args) => {
        exchangeCalls.push(args);
        return {
          accessToken: `at-${args.code}`,
          refreshToken: `rt-${args.code}`,
          expiresAt: 9_999_999_999_000,
        };
      },
      refreshToken: async () => ({ accessToken: "x" }),
    },
    onConnected: async () => ({ fakeCursor: "cursor-1" }),
    create: () => provider,
  };
  reg.register(mod);
  return reg;
}

function ctx(user: GraphQLContext["user"] = { id: userId, email: "a@drivebase.local", name: "A" }): GraphQLContext {
  const config: AppConfig = {
    server: { env: "dev", port: 0, host: "127.0.0.1" },
    db: { url: pg.url },
    redis: { url: redis.url },
    crypto: { masterKeyBase64: MASTER_KEY },
    auth: { betterAuthSecret: "x".repeat(32), baseUrl: "http://localhost:4000", trustedOrigins: [] },
    uploads: {
      stagingDir: "/tmp/drivebase-uploads-test",
      defaultChunkSizeBytes: 8 * 1024 * 1024,
      sessionTtlSeconds: 24 * 60 * 60,
    },
    cache: {
      childrenTtlSeconds: 60,
      usageTtlSeconds: 600,
    },
    workers: {
      concurrency: { upload: 1, download: 1, transfer: 1, copy: 1, move: 1, delete: 1, syncReconcile: 1, usageRefresh: 1 },
    },
    log: { level: "warn" },
  };
  return {
    db: pg.db,
    log: createLogger({ env: "prod", level: "warn", base: { app: "oauth-test" } }),
    config,
    registry: makeRegistry(),
    pubsub,
    redis: primary,
    cache: new CacheService(primary, {
      children: config.cache.childrenTtlSeconds,
      usage: config.cache.usageTtlSeconds,
    }),
    user,
    requestId: "test",
  };
}

const BEGIN = parse(/* GraphQL */ `
  mutation Begin($input: BeginProviderOAuthInput!) {
    beginProviderOAuth(input: $input) { authorizeUrl state }
  }
`);
const COMPLETE = parse(/* GraphQL */ `
  mutation Complete($input: CompleteProviderOAuthInput!) {
    completeProviderOAuth(input: $input) { id type oauthAppId label }
  }
`);

async function begin(input: { oauthAppId: string; label: string }, c = ctx()) {
  return execute({ schema: gqlSchema, document: BEGIN, variableValues: { input }, contextValue: c });
}
async function complete(input: { state: string; code: string }, c = ctx()) {
  return execute({ schema: gqlSchema, document: COMPLETE, variableValues: { input }, contextValue: c });
}

describe("beginProviderOAuth", () => {
  test("returns URL + state and stashes a TTL'd state bound to the user", async () => {
    const r = await begin({ oauthAppId: fakeAppId, label: "my-drive" });
    const payload = r.data?.beginProviderOAuth as { authorizeUrl: string; state: string };
    expect(r.errors).toBeUndefined();
    expect(payload.authorizeUrl).toContain("client_id=fake-client-id");
    expect(payload.authorizeUrl).toContain(`state=${payload.state}`);

    const raw = await primary.get(oauthStateKey(payload.state));
    const stash = JSON.parse(raw ?? "{}") as OAuthStateStash;
    expect(stash).toMatchObject({ userId, oauthAppId: fakeAppId, label: "my-drive", providerType: "fake" });
    const ttl = await primary.ttl(oauthStateKey(payload.state));
    expect(ttl).toBeGreaterThan(0);
  });

  test("404s unknown or other-user oauth apps", async () => {
    const r1 = await begin({ oauthAppId: "00000000-0000-0000-0000-000000000000", label: "x" });
    expect(r1.errors?.[0]?.message).toMatch(/oauth app not found/i);
    const r2 = await begin({ oauthAppId: otherUsersAppId, label: "x" });
    expect(r2.errors?.[0]?.message).toMatch(/oauth app not found/i);
  });
});

describe("completeProviderOAuth", () => {
  test("exchanges the code, persists encrypted creds, merges probe + onConnected metadata", async () => {
    const b = await begin({ oauthAppId: fakeAppId, label: "my-drive" });
    const { state } = b.data?.beginProviderOAuth as { state: string };

    const r = await complete({ state, code: "auth-xyz" });
    expect(r.errors).toBeUndefined();
    const { id } = r.data?.completeProviderOAuth as { id: string };

    // exchangeCode was invoked with the server-derived redirectUri and the
    // decrypted client secret from the oauth_apps row.
    expect(exchangeCalls).toEqual([
      {
        clientId: "fake-client-id",
        clientSecret: "fake-client-secret",
        redirectUri: "http://localhost:4000/oauth/callback",
        code: "auth-xyz",
      },
    ]);

    const [row] = await pg.db
      .select()
      .from(dbSchema.providers)
      .where(and(eq(dbSchema.providers.id, id), eq(dbSchema.providers.userId, userId)))
      .limit(1);
    if (!row) throw new Error("row missing");
    expect(row).toMatchObject({ type: "fake", authKind: "oauth", label: "my-drive", oauthAppId: fakeAppId });
    expect(row.metadata).toMatchObject({ probed: true, fakeCursor: "cursor-1" });

    if (!row.credentials) throw new Error("creds missing");
    const decrypted = await decryptJson<{ accessToken: string; refreshToken?: string; expiresAt?: number }>(
      MASTER_KEY,
      row.credentials,
    );
    expect(decrypted).toEqual({
      accessToken: "at-auth-xyz",
      refreshToken: "rt-auth-xyz",
      expiresAt: 9_999_999_999_000,
    });

    // GETDEL consumed the state — no replay.
    expect(await primary.get(oauthStateKey(state))).toBeNull();
  });

  test("replays fail because state GETDEL was atomic", async () => {
    const b = await begin({ oauthAppId: fakeAppId, label: "replay-test" });
    const { state } = b.data?.beginProviderOAuth as { state: string };
    await complete({ state, code: "first" });
    const r = await complete({ state, code: "second" });
    expect(r.errors?.[0]?.message).toMatch(/state expired or already consumed/i);
    expect(exchangeCalls).toHaveLength(1);
  });

  test("refuses state stashed by a different user", async () => {
    const b = await begin({ oauthAppId: fakeAppId, label: "xuser" });
    const { state } = b.data?.beginProviderOAuth as { state: string };
    const r = await complete(
      { state, code: "x" },
      ctx({ id: otherUserId, email: "b@drivebase.local", name: "B" }),
    );
    expect(r.errors?.[0]?.message).toMatch(/does not belong to the current user/i);
    expect(exchangeCalls).toHaveLength(0);
  });
});
