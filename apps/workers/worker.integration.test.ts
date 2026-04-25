import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  CreateBucketCommand,
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Queue } from "bullmq";
import { eq } from "drizzle-orm";
import { encryptJson, globalRegistry, type ProviderRegistry, type PlanEntry } from "@drivebase/storage";
import { s3Module } from "@drivebase/provider-s3";
import { schema } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import {
  connectRedis,
  startMinio,
  startPostgres,
  startRedis,
  type MinioHarness,
  type PostgresHarness,
  type RedisHarness,
} from "@drivebase/testing";
import { createLogger } from "@drivebase/logger";
import { CacheService } from "@drivebase/cache";
import { startWorkers } from "./workers.ts";
import type { WorkerDeps } from "./runtime/deps.ts";
import { createTelemetryClient } from "@drivebase/telemetry";
import { makeQueueFactory } from "./queues.ts";

/**
 * End-to-end: preflight enqueues a transfer job, the worker picks it up,
 * streams the bytes from src MinIO bucket to dst MinIO bucket, and the
 * operation flips to `succeeded`. Exercises:
 *   - ioredis + BullMQ round-trip
 *   - provider registry + credential decrypt inside the worker
 *   - S3 provider download → upload pipe
 *   - `maybeFinalizeOperation` transition to terminal state
 */

let pg: PostgresHarness;
let redis: RedisHarness;
let minio: MinioHarness;
let deps: WorkerDeps;
let workers: ReturnType<typeof startWorkers>;
let queue: Queue;
let userId: string;
let srcProviderId: string;
let dstProviderId: string;

const MASTER_KEY = Buffer.from(
  "00000000000000000000000000000000000000000000",
  "utf-8",
)
  .subarray(0, 32)
  .toString("base64");

async function createBucket(args: {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}) {
  const client = new S3Client({
    region: "us-east-1",
    endpoint: args.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: args.accessKey,
      secretAccessKey: args.secretKey,
    },
  });
  try {
    await client.send(new CreateBucketCommand({ Bucket: args.bucket }));
  } finally {
    client.destroy();
  }
}

beforeAll(async () => {
  [pg, redis, minio] = await Promise.all([
    startPostgres(),
    startRedis(),
    startMinio(),
  ]);

  // Two buckets on the same MinIO instance — the cross-provider transfer
  // only needs two registered provider rows, not two servers.
  await createBucket({
    endpoint: minio.endpoint,
    bucket: "src-bucket",
    accessKey: minio.accessKey,
    secretKey: minio.secretKey,
  });
  await createBucket({
    endpoint: minio.endpoint,
    bucket: "dst-bucket",
    accessKey: minio.accessKey,
    secretKey: minio.secretKey,
  });

  // Seed user + both providers with encrypted creds.
  const [u] = await pg.db
    .insert(schema.user)
    .values({ id: "u_wk_1", name: "Worker Test", email: "w@drivebase.local" })
    .returning();
  if (!u) throw new Error("user seed failed");
  userId = u.id;

  const s3Creds = {
    accessKeyId: minio.accessKey,
    secretAccessKey: minio.secretKey,
    endpoint: minio.endpoint,
    region: "us-east-1",
  };
  const srcCreds = await encryptJson(MASTER_KEY, {
    ...s3Creds,
    bucket: "src-bucket",
  });
  const dstCreds = await encryptJson(MASTER_KEY, {
    ...s3Creds,
    bucket: "dst-bucket",
  });
  const [src] = await pg.db
    .insert(schema.providers)
    .values({
      userId,
      type: "s3",
      authKind: "credentials",
      label: "src-bucket",
      credentials: srcCreds,
      metadata: { bucket: "src-bucket" },
    })
    .returning();
  const [dst] = await pg.db
    .insert(schema.providers)
    .values({
      userId,
      type: "s3",
      authKind: "credentials",
      label: "dst-bucket",
      credentials: dstCreds,
      metadata: { bucket: "dst-bucket" },
    })
    .returning();
  if (!src || !dst) throw new Error("provider seed failed");
  srcProviderId = src.id;
  dstProviderId = dst.id;

  // Upload a test file to the src bucket so there's something to transfer.
  const registry: ProviderRegistry = globalRegistry;
  // Idempotent: s3Module may already be registered if another test in the
  // same process touched it first.
  if (!registryHas(registry, "s3")) registry.register(s3Module);
  const srcProvider = await registry.instantiate(
    "s3",
    {
      kind: "credentials",
      accessKeyId: minio.accessKey,
      secretAccessKey: minio.secretKey,
      endpoint: minio.endpoint,
      region: "us-east-1",
      bucket: "src-bucket",
    },
    {},
  );
  const payload = new TextEncoder().encode("hello from drivebase worker e2e");
  await srcProvider.upload({
    parentRemoteId: null,
    name: "hello.txt",
    stream: new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(payload);
        c.close();
      },
    }),
    size: payload.byteLength,
  });

  // Wire the worker process.
  const config: AppConfig = {
    server: { env: "dev", port: 0, host: "127.0.0.1" },
    db: { url: pg.url },
    redis: { url: redis.url },
    crypto: { masterKeyBase64: MASTER_KEY },
    auth: {
      betterAuthSecret: "x".repeat(32),
      baseUrl: "http://localhost:4000",
      trustedOrigins: [],
    },
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
  // Use prod mode (no pino-pretty transport) so the test doesn't need
  // pino-pretty in its devDependencies.
  const log = createLogger({
    env: "prod",
    level: "warn",
    base: { app: "workers-test" },
  });
  deps = {
    db: pg.db,
    config,
    registry,
    log,
    primary: redis.client,
    // A second ioredis client for PUBLISH so BullMQ's blocking BRPOP on
    // `primary` can't starve it. Fresh `connectRedis` (not `.duplicate()`)
    // so the new socket is awaited to `ready` and has an `error` listener
    // attached — same startup-race protection as the harness client.
    pub: await connectRedis(redis.url),
    cache: new CacheService(redis.client, {
      children: config.cache.childrenTtlSeconds,
      usage: config.cache.usageTtlSeconds,
    }),
    telemetry: createTelemetryClient({ disabled: true }),
    getQueue: makeQueueFactory(redis.client),
  };
  workers = startWorkers(deps);
}, 180_000);

afterAll(async () => {
  if (queue) await queue.close();
  if (workers) await Promise.all(workers.map((w) => w.close()));
  await deps?.pub.quit().catch(() => {});
  await Promise.allSettled([pg?.stop(), redis?.stop(), minio?.stop()]);
}, 120_000);

describe("workers (integration)", () => {
  test("transfer: pipes bytes from src bucket to dst bucket, flips op to succeeded", async () => {
    // Insert an operation + job directly. We could go through the API's
    // orchestrator, but that would pull half of apps/api into workers' test
    // graph — this keeps the test scoped to the worker process.
    const [op] = await pg.db
      .insert(schema.operations)
      .values({
        userId,
        kind: "transfer",
        strategy: "overwrite",
        status: "running",
        plan: {},
      })
      .returning();
    if (!op) throw new Error("operation seed failed");

    const entry: PlanEntry = {
      kind: "transfer",
      src: {
        providerId: srcProviderId,
        remoteId: "hello.txt",
        path: "/hello.txt",
        name: "hello.txt",
      },
      dst: {
        providerId: dstProviderId,
        parentRemoteId: null,
        path: "/hello.txt",
        name: "hello.txt",
      },
      size: 31,
    };

    const [job] = await pg.db
      .insert(schema.jobs)
      .values({
        operationId: op.id,
        kind: "transfer",
        status: "queued",
        payload: entry as unknown as Record<string, unknown>,
        sizeBytes: entry.size,
      })
      .returning();
    if (!job) throw new Error("job seed failed");

    queue = new Queue("transfer", { connection: redis.client });
    await queue.add(
      "transfer",
      { jobId: job.id, entry },
      { jobId: job.id },
    );

    // Wait for the operation to finalize. Poll the DB — faster and more
    // precise than subscribing to the progress channel for a one-shot test.
    const terminal = await waitForStatus(op.id, "succeeded", 30_000);
    expect(terminal).toBe("succeeded");

    // Job row bookkeeping.
    const [jobRow] = await pg.db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, job.id));
    expect(jobRow?.status).toBe("succeeded");
    expect(Number(jobRow?.bytesTransferred ?? 0)).toBe(31);

    // Actual bytes landed in dst bucket.
    const dstClient = new S3Client({
      region: "us-east-1",
      endpoint: minio.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: minio.accessKey,
        secretAccessKey: minio.secretKey,
      },
    });
    const got = await dstClient.send(
      new GetObjectCommand({ Bucket: "dst-bucket", Key: "hello.txt" }),
    );
    const body = await got.Body?.transformToString();
    dstClient.destroy();
    expect(body).toBe("hello from drivebase worker e2e");
  }, 60_000);

  test("transfer subtree: child files land under the created destination folder", async () => {
    const nestedPayload = new TextEncoder().encode("nested child payload");
    await (await globalRegistry.instantiate(
      "s3",
      {
        kind: "credentials",
        accessKeyId: minio.accessKey,
        secretAccessKey: minio.secretKey,
        endpoint: minio.endpoint,
        region: "us-east-1",
        bucket: "src-bucket",
      },
      {},
    )).upload({
      parentRemoteId: "docs/",
      name: "notes.txt",
      stream: new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(nestedPayload);
          c.close();
        },
      }),
      size: nestedPayload.byteLength,
    });

    const [op] = await pg.db
      .insert(schema.operations)
      .values({
        userId,
        kind: "transfer",
        strategy: "overwrite",
        status: "running",
        plan: {},
      })
      .returning();
    if (!op) throw new Error("operation seed failed");

    const folderEntry: PlanEntry = {
      kind: "createFolder",
      dst: {
        providerId: dstProviderId,
        parentRemoteId: null,
        path: "/docs",
        name: "docs",
      },
    };
    const childEntry: PlanEntry = {
      kind: "transfer",
      src: {
        providerId: srcProviderId,
        remoteId: "docs/notes.txt",
        path: "/docs/notes.txt",
        name: "notes.txt",
      },
      dst: {
        providerId: dstProviderId,
        parentRemoteId: null,
        path: "/docs/notes.txt",
        name: "notes.txt",
      },
      size: nestedPayload.byteLength,
    };

    const [folderJob] = await pg.db
      .insert(schema.jobs)
      .values({
        operationId: op.id,
        kind: "create_folder",
        status: "queued",
        payload: folderEntry as unknown as Record<string, unknown>,
      })
      .returning();
    const [childJob] = await pg.db
      .insert(schema.jobs)
      .values({
        operationId: op.id,
        kind: "transfer",
        status: "queued",
        payload: childEntry as unknown as Record<string, unknown>,
        sizeBytes: childEntry.size,
      })
      .returning();
    if (!folderJob || !childJob) throw new Error("job seed failed");

    const createFolderQueue = new Queue("createFolder", { connection: redis.client });
    queue = new Queue("transfer", { connection: redis.client });
    await createFolderQueue.add(
      "create_folder",
      { jobId: folderJob.id, entry: folderEntry },
      { jobId: folderJob.id },
    );
    await queue.add(
      "transfer",
      { jobId: childJob.id, entry: childEntry },
      { jobId: childJob.id },
    );

    const terminal = await waitForStatus(op.id, "succeeded", 30_000);
    expect(terminal).toBe("succeeded");

    const dstClient = new S3Client({
      region: "us-east-1",
      endpoint: minio.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: minio.accessKey,
        secretAccessKey: minio.secretKey,
      },
    });
    const listed = await dstClient.send(
      new ListObjectsV2Command({ Bucket: "dst-bucket", Prefix: "docs/" }),
    );
    const keys = (listed.Contents ?? []).map((obj) => obj.Key).filter(Boolean);
    const nested = await dstClient.send(
      new GetObjectCommand({ Bucket: "dst-bucket", Key: "docs/notes.txt" }),
    );
    const nestedBody = await nested.Body?.transformToString();
    dstClient.destroy();
    await createFolderQueue.close();

    expect(keys).toContain("docs/notes.txt");
    expect(keys).not.toContain("notes.txt");
    expect(nestedBody).toBe("nested child payload");
  }, 60_000);
});

function registryHas(reg: ProviderRegistry, type: string): boolean {
  try {
    reg.get(type);
    return true;
  } catch {
    return false;
  }
}

async function waitForStatus(
  operationId: string,
  want: string,
  timeoutMs: number,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const [row] = await pg.db
      .select({ status: schema.operations.status })
      .from(schema.operations)
      .where(eq(schema.operations.id, operationId));
    if (row && row.status === want) return row.status;
    await Bun.sleep(100);
  }
  const [row] = await pg.db
    .select({ status: schema.operations.status })
    .from(schema.operations)
    .where(eq(schema.operations.id, operationId));
  return row?.status ?? "unknown";
}
