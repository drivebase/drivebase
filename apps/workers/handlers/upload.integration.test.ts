import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { schema as dbSchema } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import { createLogger } from "@drivebase/logger";
import { CacheService } from "@drivebase/cache";
import {
  ProviderRegistry,
  encryptJson,
  type IStorageProvider,
  type UploadArgs,
  type RemoteNode,
  type ProviderCapabilities,
} from "@drivebase/storage";
import {
  connectRedis,
  startPostgres,
  startRedis,
  type PostgresHarness,
  type RedisHarness,
} from "@drivebase/testing";
import { chunkPath, ensureSessionDir } from "@drivebase/upload-staging";
import type { Redis } from "ioredis";
import { handleUpload } from "./upload.ts";
import type { HandlerContext } from "../runtime/handler.ts";
import type { WorkerDeps } from "../runtime/deps.ts";
import { evictProvider } from "../runtime/providers.ts";
import { makeQueueFactory } from "../queues.ts";

/**
 * Direct-level tests for the worker's upload finalizer. We bypass BullMQ
 * and call `handleUpload` with a hand-built `HandlerContext` so we can
 * exercise proxy / direct / failure paths deterministically.
 *
 * A fake IStorageProvider is registered with the ProviderRegistry and its
 * `upload` / `completeMultipart` hooks are swapped per-test via closures
 * captured in `fakeState`. The DB and Redis are real (testcontainers) so
 * the Drizzle queries and WorkerDeps types stay honest.
 */

let pg: PostgresHarness;
let redis: RedisHarness;
let pub: Redis;
let stagingRoot: string;
let registry: ProviderRegistry;
let deps: WorkerDeps;
let providerCredentials:
  | {
      iv: string;
      tag: string;
      ct: string;
    }
  | undefined;

const userId = "u_upload_1";
const providerId = "00000000-0000-0000-0000-0000000000a1";

type FakeHooks = {
  upload?: (args: UploadArgs) => Promise<RemoteNode>;
  completeMultipart?: (args: {
    uploadId: string;
    key: string;
    parts: Array<{ partNumber: number; etag: string }>;
  }) => Promise<RemoteNode>;
};

const fakeState: { capabilities: ProviderCapabilities; hooks: FakeHooks } = {
  capabilities: {
    isHierarchical: true,
    supportsNativeCopy: false,
    supportsNativeMove: false,
    supportsDelta: false,
    supportsChecksum: false,
    supportsMultipartUpload: false,
    supportsPresignedUploadParts: false,
  },
  hooks: {},
};

function buildFakeProvider(): IStorageProvider {
  const notImpl = (name: string) => () => {
    throw new Error(`fake provider: ${name} not implemented`);
  };
  return {
    type: "fake",
    get capabilities() {
      return fakeState.capabilities;
    },
    authenticate: async () => ({}),
    listChildren: async () => ({ nodes: [] }),
    getMetadata: notImpl("getMetadata") as IStorageProvider["getMetadata"],
    download: notImpl("download") as IStorageProvider["download"],
    upload: async (args) => {
      if (!fakeState.hooks.upload) throw new Error("fake: upload hook unset");
      return fakeState.hooks.upload(args);
    },
    createFolder: notImpl("createFolder") as IStorageProvider["createFolder"],
    move: notImpl("move") as IStorageProvider["move"],
    copy: notImpl("copy") as IStorageProvider["copy"],
    delete: notImpl("delete") as IStorageProvider["delete"],
    getUsage: async () => ({}),
    completeMultipart: async (args) => {
      if (!fakeState.hooks.completeMultipart) {
        throw new Error("fake: completeMultipart hook unset");
      }
      return fakeState.hooks.completeMultipart(args);
    },
  };
}

beforeAll(async () => {
  [pg, redis] = await Promise.all([startPostgres(), startRedis()]);
  stagingRoot = await mkdtemp(join(tmpdir(), "drivebase-upload-handler-"));
  pub = await connectRedis(redis.url);

  registry = new ProviderRegistry();
  registry.register({
    type: "fake",
    label: "Fake",
    authKind: "none",
    create: () => buildFakeProvider(),
  });

  const config: AppConfig = {
    server: { env: "dev", port: 0, host: "127.0.0.1" },
    db: { url: pg.url },
    redis: { url: redis.url },
    crypto: { masterKeyBase64: Buffer.alloc(32).toString("base64") },
    auth: {
      betterAuthSecret: "x".repeat(32),
      baseUrl: "http://localhost:4000",
      trustedOrigins: [],
    },
    uploads: {
      stagingDir: stagingRoot,
      defaultChunkSizeBytes: 8 * 1024 * 1024,
      sessionTtlSeconds: 24 * 60 * 60,
    },
    cache: {
      childrenTtlSeconds: 60,
      usageTtlSeconds: 600,
    },
    workers: {
      concurrency: {
        upload: 1,
        download: 1,
        transfer: 1,
        copy: 1,
        move: 1,
        delete: 1,
        syncReconcile: 1,
        usageRefresh: 1,
      },
    },
    log: { level: "warn" },
  };
  const log = createLogger({
    env: "prod",
    level: "warn",
    base: { app: "upload-handler-test" },
  });

  deps = {
    db: pg.db,
    config,
    registry,
    log,
    primary: redis.client,
    pub,
    cache: new CacheService(redis.client, {
      children: config.cache.childrenTtlSeconds,
      usage: config.cache.usageTtlSeconds,
    }),
    getQueue: makeQueueFactory(redis.client),
  };

  providerCredentials = await encryptJson(config.crypto.masterKeyBase64, {});

  await pg.db.insert(dbSchema.user).values([
    { id: userId, name: "Upload Owner", email: "upload@drivebase.local" },
  ]);
  if (!providerCredentials) throw new Error("provider credentials seed failed");
  await pg.db.insert(dbSchema.providers).values({
    id: providerId,
    userId,
    type: "fake",
    authKind: "none",
    label: "fake",
    status: "connected",
    credentials: providerCredentials,
  });
}, 180_000);

afterAll(async () => {
  await rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
  await pub?.quit().catch(() => {});
  await Promise.allSettled([pg?.stop(), redis?.stop()]);
}, 120_000);

afterEach(async () => {
  await pg.db.delete(dbSchema.uploadChunks);
  await pg.db.delete(dbSchema.uploadSessions);
  await pg.db.delete(dbSchema.operations);
  await rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
  // Reset capabilities + hooks so leak between tests is impossible.
  fakeState.capabilities = {
    isHierarchical: true,
    supportsNativeCopy: false,
    supportsNativeMove: false,
    supportsDelta: false,
    supportsChecksum: false,
    supportsMultipartUpload: false,
    supportsPresignedUploadParts: false,
  };
  fakeState.hooks = {};
  // Drop cached provider instance so a reconfigured `fakeState` takes effect
  // on the next invocation.
  evictProvider(providerId);
});

async function seedOperation(): Promise<string> {
  const [op] = await pg.db
    .insert(dbSchema.operations)
    .values({
      userId,
      kind: "upload",
      strategy: "overwrite",
      status: "running",
      plan: {},
    })
    .returning();
  if (!op) throw new Error("operation seed failed");
  return op.id;
}

type SessionOverrides = Partial<typeof dbSchema.uploadSessions.$inferInsert>;

async function seedSession(
  operationId: string,
  overrides: SessionOverrides,
): Promise<string> {
  const [row] = await pg.db
    .insert(dbSchema.uploadSessions)
    .values({
      userId,
      providerId,
      dstPath: "/hello.bin",
      name: "hello.bin",
      sizeBytes: 0,
      mode: "proxy",
      chunkSizeBytes: 4,
      totalChunks: 0,
      status: "ready",
      planId: operationId,
      ...overrides,
    })
    .returning();
  if (!row) throw new Error("session seed failed");
  return row.id;
}

async function stageChunks(
  sessionId: string,
  chunks: Uint8Array[],
): Promise<void> {
  await ensureSessionDir(stagingRoot, sessionId);
  for (let i = 0; i < chunks.length; i += 1) {
    await writeFile(chunkPath(stagingRoot, sessionId, i), chunks[i]!);
  }
}

function makeCtx(args: {
  operationId: string;
  jobId?: string;
}): HandlerContext & {
  progressCalls: number[];
} {
  const progressCalls: number[] = [];
  return {
    deps,
    jobId: args.jobId ?? "job-test",
    operationId: args.operationId,
    conflictDecision: undefined,
    entry: {
      kind: "upload",
      dst: {
        providerId,
        parentRemoteId: null,
        path: "/hello.bin",
        name: "hello.bin",
      },
    },
    reportProgress: (bytes: number) => {
      progressCalls.push(bytes);
    },
    progressCalls,
  };
}

describe("handleUpload (integration)", () => {
  test("proxy mode: assembles staging, calls provider.upload, marks completed, cleans staging", async () => {
    const operationId = await seedOperation();
    const chunks = [
      new Uint8Array([1, 2, 3, 4]),
      new Uint8Array([5, 6, 7, 8]),
      new Uint8Array([9, 10]),
    ];
    const sessionId = await seedSession(operationId, {
      name: "hello.bin",
      sizeBytes: 10,
      mode: "proxy",
      chunkSizeBytes: 4,
      totalChunks: 3,
      status: "ready",
      mimeType: "application/octet-stream",
    });
    await stageChunks(sessionId, chunks);

    const captured: {
      bytes: Uint8Array | null;
      name: string | null;
      mime: string | undefined;
    } = { bytes: null, name: null, mime: undefined };
    fakeState.hooks.upload = async (args) => {
      // Drain the stream the handler fed us and remember what arrived.
      const reader = args.stream.getReader();
      const parts: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          parts.push(value);
          total += value.byteLength;
        }
      }
      const merged = new Uint8Array(total);
      let off = 0;
      for (const p of parts) {
        merged.set(p, off);
        off += p.byteLength;
      }
      captured.bytes = merged;
      captured.name = args.name;
      captured.mime = args.mimeType;
      return {
        remoteId: "rem_1",
        name: args.name,
        type: "file",
        parentRemoteId: args.parentRemoteId ?? null,
        size: merged.byteLength,
      };
    };

    const ctx = makeCtx({ operationId });
    const res = await handleUpload(ctx);

    expect(res.bytes).toBe(10);
    expect(captured.name).toBe("hello.bin");
    expect(captured.mime).toBe("application/octet-stream");
    expect(captured.bytes).not.toBeNull();
    expect(Array.from(captured.bytes ?? new Uint8Array())).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    // meterStream should have fired at least the final total.
    expect(ctx.progressCalls.at(-1)).toBe(10);

    const [session] = await pg.db
      .select()
      .from(dbSchema.uploadSessions)
      .where(eq(dbSchema.uploadSessions.id, sessionId));
    expect(session?.status).toBe("completed");
    expect(session?.completedAt).toBeTruthy();

    // Staging cleanup is best-effort but on happy path it must succeed.
    const dirCheck = await stat(join(stagingRoot, sessionId)).catch(() => null);
    expect(dirCheck).toBeNull();
  });

  test("direct mode: calls provider.completeMultipart with stored parts, marks completed, keeps staging untouched", async () => {
    fakeState.capabilities = {
      ...fakeState.capabilities,
      supportsMultipartUpload: true,
      supportsPresignedUploadParts: true,
    };
    const operationId = await seedOperation();
    const sessionId = await seedSession(operationId, {
      name: "big.bin",
      sizeBytes: 20,
      mode: "direct",
      chunkSizeBytes: 10,
      totalChunks: 2,
      status: "ready",
      multipartUploadId: "up-123",
      multipartKey: "u/u_upload_1/big.bin",
      parts: [
        { partNumber: 1, etag: "e1" },
        { partNumber: 2, etag: "e2" },
      ],
    });

    const capturedComplete: {
      args:
        | { uploadId: string; key: string; parts: Array<{ partNumber: number; etag: string }> }
        | null;
    } = { args: null };
    fakeState.hooks.completeMultipart = async (args) => {
      capturedComplete.args = args;
      return {
        remoteId: args.key,
        name: "big.bin",
        type: "file",
        parentRemoteId: null,
        size: 20,
      };
    };

    const ctx = makeCtx({ operationId });
    const res = await handleUpload(ctx);
    expect(res.bytes).toBe(20);
    expect(capturedComplete.args).toEqual({
      uploadId: "up-123",
      key: "u/u_upload_1/big.bin",
      parts: [
        { partNumber: 1, etag: "e1" },
        { partNumber: 2, etag: "e2" },
      ],
    });
    // Direct mode emits a single final progress tick equal to the session size.
    expect(ctx.progressCalls).toEqual([20]);

    const [session] = await pg.db
      .select()
      .from(dbSchema.uploadSessions)
      .where(eq(dbSchema.uploadSessions.id, sessionId));
    expect(session?.status).toBe("completed");
  });

  test("provider.upload throws: session flipped to failed with lastError, error rethrown", async () => {
    const operationId = await seedOperation();
    const sessionId = await seedSession(operationId, {
      sizeBytes: 4,
      chunkSizeBytes: 4,
      totalChunks: 1,
      status: "ready",
    });
    await stageChunks(sessionId, [new Uint8Array([9, 9, 9, 9])]);

    fakeState.hooks.upload = async () => {
      throw new Error("upstream 503");
    };

    await expect(handleUpload(makeCtx({ operationId }))).rejects.toThrow(
      "upstream 503",
    );

    const [session] = await pg.db
      .select()
      .from(dbSchema.uploadSessions)
      .where(eq(dbSchema.uploadSessions.id, sessionId));
    expect(session?.status).toBe("failed");
    expect(session?.lastError).toContain("upstream 503");
  });

  test("throws when no upload_session is linked to the operation", async () => {
    const operationId = await seedOperation();
    // No session inserted.
    await expect(handleUpload(makeCtx({ operationId }))).rejects.toThrow(
      /upload job has no upload_session/,
    );
  });

  test("throws when session is not ready (e.g. still uploading)", async () => {
    const operationId = await seedOperation();
    await seedSession(operationId, {
      sizeBytes: 1,
      chunkSizeBytes: 1,
      totalChunks: 1,
      status: "uploading",
    });
    await expect(handleUpload(makeCtx({ operationId }))).rejects.toThrow(
      /expected ready/,
    );
  });

  test("direct mode without completeMultipart hook on provider: throws and marks failed", async () => {
    // Leave capabilities default (supportsMultipartUpload=false) so the
    // provider exposes no completeMultipart. But session still claims direct
    // — this is the "provider regressed caps after session was made" case.
    const operationId = await seedOperation();
    const sessionId = await seedSession(operationId, {
      sizeBytes: 10,
      chunkSizeBytes: 10,
      totalChunks: 1,
      status: "ready",
      mode: "direct",
      multipartUploadId: "up-1",
      multipartKey: "k",
      parts: [{ partNumber: 1, etag: "e1" }],
    });

    // Build a provider that deliberately lacks completeMultipart. Re-register
    // under a fresh type so we don't clobber the main "fake" module.
    registry.register({
      type: "fake_no_multi",
      label: "No-multi",
      authKind: "none",
      create: () => {
        const base = buildFakeProvider();
        // Strip completeMultipart — the capability check in the handler is
        // the thing under test.
        const stripped: IStorageProvider = { ...base, completeMultipart: undefined };
        return stripped;
      },
    });
    // Flip the provider row's type to the no-multi module so getProvider builds it.
    await pg.db.execute(
      `update providers set type='fake_no_multi' where id='${providerId}'` as never,
    );
    evictProvider(providerId);

    try {
      await expect(handleUpload(makeCtx({ operationId }))).rejects.toThrow(
        /no completeMultipart/,
      );
      const [session] = await pg.db
        .select()
        .from(dbSchema.uploadSessions)
        .where(eq(dbSchema.uploadSessions.id, sessionId));
      expect(session?.status).toBe("failed");
      expect(session?.lastError).toContain("no completeMultipart");
    } finally {
      await pg.db.execute(
        `update providers set type='fake' where id='${providerId}'` as never,
      );
      evictProvider(providerId);
    }
  });

  test("direct mode missing parts count: throws with descriptive error", async () => {
    fakeState.capabilities = {
      ...fakeState.capabilities,
      supportsMultipartUpload: true,
      supportsPresignedUploadParts: true,
    };
    const operationId = await seedOperation();
    await seedSession(operationId, {
      sizeBytes: 20,
      chunkSizeBytes: 10,
      totalChunks: 2,
      status: "ready",
      mode: "direct",
      multipartUploadId: "up-xyz",
      multipartKey: "k",
      parts: [{ partNumber: 1, etag: "only-one" }], // expected 2
    });

    await expect(handleUpload(makeCtx({ operationId }))).rejects.toThrow(
      /expected 2 parts, got 1/,
    );
  });
});
