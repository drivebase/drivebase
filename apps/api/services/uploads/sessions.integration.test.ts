import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { schema as dbSchema } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import {
  ProviderRegistry,
  type IStorageProvider,
  type PlanEntry,
  type ProviderCapabilities,
  type ProviderModule,
  type RemoteNode,
} from "@drivebase/storage";
import { startPostgres, type PostgresHarness } from "@drivebase/testing";
import {
  cancelUploadSession,
  completeUploadSession,
  getUploadSession,
  initiateUploadSession,
  listActiveUploadSessions,
} from "./sessions.ts";
import { chunkPath, ensureSessionDir } from "@drivebase/upload-staging";
import { encryptCredentials } from "../providers.ts";

/**
 * Exercises the upload-session service layer against a real Postgres.
 * The destination provider is faked — we just want to see that:
 *   - initiate picks proxy vs direct off capabilities
 *   - direct mode initiates upstream multipart + returns presigned parts
 *   - complete validates chunks (proxy) and part lists (direct)
 *   - cancel cleans staging (proxy) or aborts multipart (direct)
 */

const MASTER_KEY = Buffer.alloc(32).toString("base64");

let pg: PostgresHarness;
let stagingRoot: string;
let userId: string;

const providerIds = { proxy: "", direct: "" };

// Records of what the fake provider was asked to do.
let initiateCalls: Array<{ name: string; size: number }> = [];
let presignCalls: Array<{ uploadId: string; partNumbers: number[] }> = [];
let abortCalls: Array<{ uploadId: string; key: string }> = [];

function capabilities(extra: Partial<ProviderCapabilities>): ProviderCapabilities {
  return {
    isHierarchical: true,
    supportsNativeCopy: false,
    supportsNativeMove: false,
    supportsDelta: false,
    supportsChecksum: false,
    supportsMultipartUpload: false,
    supportsPresignedUploadParts: false,
    ...extra,
  };
}

function baseProvider(type: string, caps: ProviderCapabilities): IStorageProvider {
  const stubNode: RemoteNode = {
    remoteId: "",
    name: "",
    type: "file",
    parentRemoteId: null,
  };
  return {
    type,
    capabilities: caps,
    authenticate: async () => ({}),
    listChildren: async () => ({ nodes: [] }),
    getMetadata: async () => stubNode,
    download: async () => new ReadableStream<Uint8Array>(),
    upload: async () => stubNode,
    createFolder: async () => ({ ...stubNode, type: "folder" as const }),
    move: async () => stubNode,
    copy: async () => stubNode,
    delete: async () => {},
    getUsage: async () => ({}),
  };
}

function makeRegistry(): ProviderRegistry {
  const reg = new ProviderRegistry();

  const proxyMod: ProviderModule = {
    type: "fake-proxy",
    label: "Fake Proxy",
    authKind: "none",
    create: () => baseProvider("fake-proxy", capabilities({})),
  };

  const directMod: ProviderModule = {
    type: "fake-direct",
    label: "Fake Direct",
    authKind: "none",
    create: () => {
      const p = baseProvider(
        "fake-direct",
        capabilities({
          supportsMultipartUpload: true,
          supportsPresignedUploadParts: true,
        }),
      );
      p.initiateMultipart = async (args) => {
        initiateCalls.push({ name: args.name, size: args.size ?? 0 });
        return { uploadId: `upl-${args.name}`, key: `bucket/${args.name}` };
      };
      p.generatePresignedPartUrls = async (args) => {
        presignCalls.push({
          uploadId: args.uploadId,
          partNumbers: args.partNumbers,
        });
        return args.partNumbers.map((n) => ({
          partNumber: n,
          url: `https://s3.local/${args.key}?part=${n}`,
        }));
      };
      p.abortMultipart = async (args) => {
        abortCalls.push({ uploadId: args.uploadId, key: args.key });
      };
      p.completeMultipart = async () => ({
        remoteId: "done",
        name: "done",
        type: "file",
        parentRemoteId: null,
      });
      p.uploadPart = async () => ({ etag: "x" });
      return p;
    },
  };

  reg.register(proxyMod);
  reg.register(directMod);
  return reg;
}

function makeConfig(): AppConfig {
  return {
    server: { env: "dev", port: 0, host: "127.0.0.1" },
    db: { url: pg.url },
    redis: { url: "redis://unused:0" },
    crypto: { masterKeyBase64: MASTER_KEY },
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
}

const registry = () => makeRegistry();
const deps = () => ({ db: pg.db, config: makeConfig(), registry: registry() });

beforeAll(async () => {
  pg = await startPostgres();
  stagingRoot = await mkdtemp(join(tmpdir(), "drivebase-upload-test-"));

  const [u] = await pg.db
    .insert(dbSchema.user)
    .values({ id: "u_up_1", name: "U", email: "u@drivebase.local" })
    .returning();
  if (!u) throw new Error("user seed failed");
  userId = u.id;

  const emptyCredentials = await encryptCredentials({
    config: makeConfig(),
    value: {},
  });

  const [p1, p2] = await pg.db
    .insert(dbSchema.providers)
    .values([
      {
        userId,
        type: "fake-proxy",
        authKind: "none",
        label: "proxy-pv",
        status: "connected",
        credentials: emptyCredentials,
      },
      {
        userId,
        type: "fake-direct",
        authKind: "none",
        label: "direct-pv",
        status: "connected",
        credentials: emptyCredentials,
      },
    ])
    .returning();
  if (!p1 || !p2) throw new Error("provider seed failed");
  providerIds.proxy = p1.id;
  providerIds.direct = p2.id;
}, 180_000);

afterAll(async () => {
  await rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
  await pg?.stop();
}, 60_000);

beforeEach(() => {
  initiateCalls = [];
  presignCalls = [];
  abortCalls = [];
});

afterEach(async () => {
  await pg.db.delete(dbSchema.uploadChunks);
  await pg.db.delete(dbSchema.uploadSessions);
  await pg.db.delete(dbSchema.operations);
});

// Build a `ready` upload operation with a single-file plan. Returns the op id.
async function seedReadyUploadOp(args: {
  providerId: string;
  name: string;
  size: number;
  parentRemoteId?: string | null;
}): Promise<string> {
  const entry: PlanEntry = {
    kind: "upload",
    dst: {
      providerId: args.providerId,
      parentRemoteId: args.parentRemoteId ?? null,
      path: `/${args.name}`,
      name: args.name,
    },
    size: args.size,
  };
  const plan = {
    id: "",
    input: {
      kind: "upload",
      dstProviderId: args.providerId,
      dstParentId: null,
      tree: [],
      strategy: "error",
    },
    entries: [entry],
    conflicts: [],
  };
  const [op] = await pg.db
    .insert(dbSchema.operations)
    .values({
      userId,
      kind: "upload",
      status: "ready",
      strategy: "error",
      plan: { ...plan },
      summary: { totalEntries: 1, totalBytes: args.size, conflicts: 0 },
    })
    .returning();
  if (!op) throw new Error("op seed failed");
  return op.id;
}

describe("initiateUploadSession", () => {
  test("proxy-mode providers get a chunk URL pattern and no presigned parts", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "readme.txt",
      size: 12,
    });
    const r = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    expect(r.session.mode).toBe("proxy");
    expect(r.session.totalChunks).toBe(3);
    expect(r.session.chunkSizeBytes).toBe(4);
    expect(r.chunkUploadUrlPattern).toBe(`/api/upload/${r.session.id}/{index}`);
    expect(r.presignedParts).toBeNull();
    expect(initiateCalls).toHaveLength(0);
  });

  test("direct-mode providers trigger upstream multipart + presign every part", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.direct,
      name: "big.bin",
      size: 10_000_000,
    });
    const r = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4_000_000,
    });
    expect(r.session.mode).toBe("direct");
    expect(r.session.totalChunks).toBe(3);
    expect(r.session.multipartUploadId).toBe("upl-big.bin");
    expect(r.session.multipartKey).toBe("bucket/big.bin");
    expect(r.chunkUploadUrlPattern).toBeNull();
    expect(r.presignedParts).toHaveLength(3);
    expect(r.presignedParts?.map((p) => p.partNumber)).toEqual([1, 2, 3]);
    expect(initiateCalls).toEqual([{ name: "big.bin", size: 10_000_000 }]);
    expect(presignCalls).toEqual([
      { uploadId: "upl-big.bin", partNumbers: [1, 2, 3] },
    ]);
  });

  test("rejects non-ready operations", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "x",
      size: 10,
    });
    await pg.db
      .update(dbSchema.operations)
      .set({ status: "awaiting_user" })
      .where(eq(dbSchema.operations.id, opId));
    await expect(
      initiateUploadSession({ deps: deps(), userId, operationId: opId }),
    ).rejects.toThrow(/must be ready/);
  });

  test("rejects double-initiate on the same operation", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "x",
      size: 10,
    });
    await initiateUploadSession({ deps: deps(), userId, operationId: opId });
    await expect(
      initiateUploadSession({ deps: deps(), userId, operationId: opId }),
    ).rejects.toThrow(/already initiated/);
  });

  test("rejects operations owned by a different user", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "x",
      size: 10,
    });
    await expect(
      initiateUploadSession({
        deps: deps(),
        userId: "someone-else",
        operationId: opId,
      }),
    ).rejects.toThrow(/operation not found/);
  });
});

describe("completeUploadSession", () => {
  test("proxy: requires every chunk to be present in upload_chunks", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "hello.txt",
      size: 12,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    // Missing chunks → error.
    await expect(
      completeUploadSession({
        deps: deps(),
        userId,
        sessionId: session.id,
      }),
    ).rejects.toThrow(/missing 3 of 3/);

    // Record all three chunks.
    await pg.db.insert(dbSchema.uploadChunks).values([
      { sessionId: session.id, index: 0, size: 4 },
      { sessionId: session.id, index: 1, size: 4 },
      { sessionId: session.id, index: 2, size: 4 },
    ]);
    const ready = await completeUploadSession({
      deps: deps(),
      userId,
      sessionId: session.id,
    });
    expect(ready.status).toBe("ready");
  });

  test("direct: persists sorted parts and flips to ready", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.direct,
      name: "big.bin",
      size: 8,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    expect(session.totalChunks).toBe(2);

    // Out-of-order parts — service sorts them.
    const ready = await completeUploadSession({
      deps: deps(),
      userId,
      sessionId: session.id,
      parts: [
        { partNumber: 2, etag: "etag-2" },
        { partNumber: 1, etag: "etag-1" },
      ],
    });
    expect(ready.status).toBe("ready");
    expect(ready.parts).toEqual([
      { partNumber: 1, etag: "etag-1" },
      { partNumber: 2, etag: "etag-2" },
    ]);
  });

  test("direct: wrong part count is rejected", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.direct,
      name: "big.bin",
      size: 8,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    await expect(
      completeUploadSession({
        deps: deps(),
        userId,
        sessionId: session.id,
        parts: [{ partNumber: 1, etag: "only" }],
      }),
    ).rejects.toThrow(/2 parts, got 1/);
  });

  test("direct: non-contiguous part numbers are rejected", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.direct,
      name: "big.bin",
      size: 8,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    await expect(
      completeUploadSession({
        deps: deps(),
        userId,
        sessionId: session.id,
        parts: [
          { partNumber: 1, etag: "a" },
          { partNumber: 3, etag: "b" },
        ],
      }),
    ).rejects.toThrow(/contiguously/);
  });
});

describe("cancelUploadSession", () => {
  test("proxy: removes staging directory and marks cancelled", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "x.bin",
      size: 8,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    // Simulate the REST endpoint creating the staging dir.
    await ensureSessionDir(stagingRoot, session.id);
    const chunkFile = chunkPath(stagingRoot, session.id, 0);
    await Bun.write(chunkFile, "partial");

    const cancelled = await cancelUploadSession({
      deps: deps(),
      userId,
      sessionId: session.id,
    });
    expect(cancelled.status).toBe("cancelled");
    await expect(stat(chunkFile)).rejects.toThrow();
    expect(abortCalls).toHaveLength(0);
  });

  test("direct: fires abortMultipart on the upstream", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.direct,
      name: "big.bin",
      size: 10,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    const cancelled = await cancelUploadSession({
      deps: deps(),
      userId,
      sessionId: session.id,
    });
    expect(cancelled.status).toBe("cancelled");
    expect(abortCalls).toEqual([
      { uploadId: "upl-big.bin", key: "bucket/big.bin" },
    ]);
  });

  test("cancelling an already-cancelled session is a no-op", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "idem.bin",
      size: 4,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
      chunkSizeBytesOverride: 4,
    });
    await cancelUploadSession({
      deps: deps(),
      userId,
      sessionId: session.id,
    });
    const again = await cancelUploadSession({
      deps: deps(),
      userId,
      sessionId: session.id,
    });
    expect(again.status).toBe("cancelled");
  });
});

describe("queries", () => {
  test("listActiveUploadSessions excludes terminal rows", async () => {
    const liveId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "live.bin",
      size: 4,
    });
    const goneId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "gone.bin",
      size: 4,
    });
    const live = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: liveId,
    });
    const gone = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: goneId,
    });
    await cancelUploadSession({
      deps: deps(),
      userId,
      sessionId: gone.session.id,
    });

    const active = await listActiveUploadSessions({ db: pg.db, userId });
    const ids = active.map((s) => s.id);
    expect(ids).toContain(live.session.id);
    expect(ids).not.toContain(gone.session.id);
  });

  test("getUploadSession is scoped to the user", async () => {
    const opId = await seedReadyUploadOp({
      providerId: providerIds.proxy,
      name: "scoped.bin",
      size: 4,
    });
    const { session } = await initiateUploadSession({
      deps: deps(),
      userId,
      operationId: opId,
    });
    const mine = await getUploadSession({
      db: pg.db,
      userId,
      id: session.id,
    });
    expect(mine?.id).toBe(session.id);

    const theirs = await getUploadSession({
      db: pg.db,
      userId: "someone-else",
      id: session.id,
    });
    expect(theirs).toBeNull();

    // Sanity: the row really exists under the owning user.
    const [raw] = await pg.db
      .select()
      .from(dbSchema.uploadSessions)
      .where(
        and(
          eq(dbSchema.uploadSessions.id, session.id),
          eq(dbSchema.uploadSessions.userId, userId),
        ),
      )
      .limit(1);
    expect(raw?.id).toBe(session.id);
  });
});
