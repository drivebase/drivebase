import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { execute, parse } from "graphql";
import type { Redis } from "ioredis";
import { and, eq, ne } from "drizzle-orm";
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
  encryptJson,
  type IStorageProvider,
  type ProviderModule,
} from "@drivebase/storage";
import { CacheService } from "@drivebase/cache";
import { buildSchema } from "~/graphql/schema.ts";
import { pubsub } from "~/pubsub.ts";
import type { GraphQLContext } from "~/graphql/context.ts";

let pg: PostgresHarness;
let redis: RedisHarness;
let primary: Redis;
let gqlSchema: Awaited<ReturnType<typeof buildSchema>>;
let userId: string;
let providerId: string;
let parentId: string;
let createdCalls: Array<{ parentRemoteId: string | null; name: string }> = [];
let providerCredentials:
  | {
      iv: string;
      tag: string;
      ct: string;
    }
  | undefined;

beforeAll(async () => {
  [pg, redis] = await Promise.all([startPostgres(), startRedis()]);
  primary = await connectRedis(redis.url);
  gqlSchema = await buildSchema();
  providerCredentials = await encryptJson(Buffer.alloc(32).toString("base64"), {});

  const [user] = await pg.db
    .insert(dbSchema.user)
    .values({ id: "u_nodes_1", name: "Nodes Test", email: "nodes@drivebase.local" })
    .returning();
  if (!user) throw new Error("user seed failed");
  userId = user.id;

  const [provider] = await pg.db
    .insert(dbSchema.providers)
    .values({
      userId,
      type: "fake_nodes",
      authKind: "none",
      label: "fake-nodes",
      credentials: providerCredentials,
      metadata: {},
    })
    .returning();
  if (!provider) throw new Error("provider seed failed");
  providerId = provider.id;

  const [parent] = await pg.db
    .insert(dbSchema.nodes)
    .values({
      providerId,
      remoteId: "parent-1",
      name: "parent",
      type: "folder",
      pathText: "/parent",
    })
    .returning();
  if (!parent) throw new Error("parent seed failed");
  parentId = parent.id;
}, 180_000);

afterAll(async () => {
  await primary?.quit().catch(() => {});
  await Promise.allSettled([pg?.stop(), redis?.stop()]);
}, 60_000);

beforeEach(async () => {
  createdCalls = [];
  await pg.db
    .delete(dbSchema.nodes)
    .where(
      and(
        eq(dbSchema.nodes.providerId, providerId),
        ne(dbSchema.nodes.id, parentId),
      ),
    );
});

function makeRegistry(): ProviderRegistry {
  const reg = new ProviderRegistry();
  const provider = {
    type: "fake_nodes",
    capabilities: {
      isHierarchical: true,
      supportsNativeCopy: false,
      supportsNativeMove: false,
      supportsDelta: false,
      supportsChecksum: false,
      supportsMultipartUpload: false,
      supportsPresignedUploadParts: false,
    },
    authenticate: async () => ({ metadataPatch: {} }),
    listChildren: async () => ({ nodes: [] }),
    getMetadata: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    download: async () => new ReadableStream<Uint8Array>(),
    upload: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    createFolder: async (parentRemoteId, name) => {
      createdCalls.push({ parentRemoteId, name });
      return {
        remoteId: `${parentRemoteId ?? "root"}${name}/`,
        name,
        type: "folder" as const,
        parentRemoteId,
      };
    },
    move: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    copy: async () => ({ remoteId: "", name: "", type: "file" as const, parentRemoteId: null }),
    delete: async () => {},
    getUsage: async () => ({}),
  } satisfies IStorageProvider;

  const mod: ProviderModule = {
    type: "fake_nodes",
    label: "Fake Nodes",
    authKind: "none",
    create: () => provider,
  };
  reg.register(mod);
  return reg;
}

function ctx(): GraphQLContext {
  const config: AppConfig = {
    server: { env: "dev", port: 0, host: "127.0.0.1" },
    db: { url: pg.url },
    redis: { url: redis.url },
    crypto: { masterKeyBase64: Buffer.alloc(32).toString("base64") },
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
    log: createLogger({ env: "prod", level: "warn", base: { app: "create-folder-test" } }),
    config,
    registry: makeRegistry(),
    pubsub,
    redis: primary,
    cache: new CacheService(primary, {
      children: config.cache.childrenTtlSeconds,
      usage: config.cache.usageTtlSeconds,
    }),
    user: { id: userId, email: "nodes@drivebase.local", name: "Nodes Test" },
    requestId: "test",
  };
}

const CREATE_FOLDER = parse(/* GraphQL */ `
  mutation CreateFolder($providerId: ID!, $parentId: ID, $name: String!) {
    createFolder(providerId: $providerId, parentId: $parentId, name: $name) {
      id
      providerId
      remoteId
      parentId
      pathText
      name
      type
    }
  }
`);

describe("createFolder", () => {
  test("creates a folder under the requested parent and persists the node row", async () => {
    const result = await execute({
      schema: gqlSchema,
      document: CREATE_FOLDER,
      variableValues: {
        providerId,
        parentId,
        name: "docs",
      },
      contextValue: ctx(),
    });

    expect(result.errors).toBeUndefined();
    expect(createdCalls).toEqual([{ parentRemoteId: "parent-1", name: "docs" }]);

    const payload = result.data?.createFolder as {
      id: string;
      providerId: string;
      remoteId: string;
      parentId: string | null;
      pathText: string;
      name: string;
      type: string;
    };
    expect(payload).toMatchObject({
      providerId,
      parentId,
      remoteId: "parent-1docs/",
      pathText: "/parent/docs",
      name: "docs",
      type: "folder",
    });

    const [row] = await pg.db
      .select()
      .from(dbSchema.nodes)
      .where(
        and(
          eq(dbSchema.nodes.id, payload.id),
          eq(dbSchema.nodes.providerId, providerId),
        ),
      )
      .limit(1);
    expect(row).toBeDefined();
    expect(row?.pathText).toBe("/parent/docs");
  });
});
