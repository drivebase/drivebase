import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { schema as dbSchema } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import { createLogger } from "@drivebase/logger";
import { encryptJson } from "@drivebase/storage";
import { startPostgres, type PostgresHarness } from "@drivebase/testing";
import { handleUploadChunk } from "./upload-chunk.ts";
import { chunkPath } from "@drivebase/upload-staging";

/**
 * End-to-end check for the chunk REST endpoint. Seeds a proxy-mode upload
 * session, fires chunks through `handleUploadChunk` as if the router had
 * already authenticated, and asserts:
 *   - bytes land at `<stagingDir>/<sessionId>/<index>.part`
 *   - upload_chunks is upserted (retries are idempotent)
 *   - session transitions pending → uploading on first chunk
 *   - 404 on foreign-user sessions, 409 on terminal sessions,
 *     400 on out-of-range or mode=direct sessions
 */

let pg: PostgresHarness;
let stagingRoot: string;
let log: ReturnType<typeof createLogger>;
let config: AppConfig;
let providerCredentials:
  | {
      iv: string;
      tag: string;
      ct: string;
    }
  | undefined;

const userId = "u_chunk_1";
const otherUserId = "u_chunk_2";
const providerId = "00000000-0000-0000-0000-000000000001";

beforeAll(async () => {
  pg = await startPostgres();
  stagingRoot = await mkdtemp(join(tmpdir(), "drivebase-chunk-"));
  log = createLogger({ env: "prod", level: "warn", base: { app: "chunk-test" } });
  config = {
    server: { env: "dev", port: 0, host: "127.0.0.1" },
    db: { url: pg.url },
    redis: { url: "redis://unused:0" },
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

  providerCredentials = await encryptJson(config.crypto.masterKeyBase64, {});

  await pg.db.insert(dbSchema.user).values([
    { id: userId, name: "Owner", email: "owner@drivebase.local" },
    { id: otherUserId, name: "Stranger", email: "stranger@drivebase.local" },
  ]);

  if (!providerCredentials) throw new Error("provider credentials seed failed");
  await pg.db.insert(dbSchema.providers).values({
    id: providerId,
    userId,
    type: "fake",
    authKind: "none",
    label: "pv",
    status: "connected",
    credentials: providerCredentials,
  });
}, 180_000);

afterAll(async () => {
  await rm(stagingRoot, { recursive: true, force: true }).catch(() => {});
  await pg?.stop();
}, 60_000);

afterEach(async () => {
  await pg.db.delete(dbSchema.uploadChunks);
  await pg.db.delete(dbSchema.uploadSessions);
});

async function seedSession(args: {
  mode: "proxy" | "direct";
  totalChunks?: number;
  status?: "pending" | "uploading" | "ready" | "cancelled";
  owner?: string;
}): Promise<string> {
  const [row] = await pg.db
    .insert(dbSchema.uploadSessions)
    .values({
      userId: args.owner ?? userId,
      providerId,
      dstPath: "/file.bin",
      name: "file.bin",
      sizeBytes: 12,
      mode: args.mode,
      chunkSizeBytes: 4,
      totalChunks: args.totalChunks ?? 3,
      status: args.status ?? "pending",
    })
    .returning();
  if (!row) throw new Error("seed failed");
  return row.id;
}

function chunkReq(sessionId: string, index: number, body: BodyInit): Request {
  return new Request(
    `http://localhost/api/upload/${sessionId}/${index}`,
    { method: "PUT", body },
  );
}

describe("handleUploadChunk", () => {
  test("writes bytes to staging + upserts upload_chunks + flips to uploading", async () => {
    const sessionId = await seedSession({ mode: "proxy" });
    const body = new Uint8Array([0, 1, 2, 3]);
    const res = await handleUploadChunk({
      req: chunkReq(sessionId, 0, body),
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 0,
    });
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { sessionId: string; index: number; size: number };
    expect(payload).toEqual({ sessionId, index: 0, size: 4 });

    const buf = await readFile(chunkPath(stagingRoot, sessionId, 0));
    expect(new Uint8Array(buf)).toEqual(body);

    const [chunkRow] = await pg.db
      .select()
      .from(dbSchema.uploadChunks)
      .where(eq(dbSchema.uploadChunks.sessionId, sessionId));
    expect(chunkRow).toMatchObject({ index: 0, size: 4 });

    const [sessionRow] = await pg.db
      .select()
      .from(dbSchema.uploadSessions)
      .where(eq(dbSchema.uploadSessions.id, sessionId));
    expect(sessionRow?.status).toBe("uploading");
  });

  test("re-uploading the same index is idempotent (last writer wins)", async () => {
    const sessionId = await seedSession({ mode: "proxy" });
    await handleUploadChunk({
      req: chunkReq(sessionId, 1, new Uint8Array([9, 9])),
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 1,
    });
    const second = await handleUploadChunk({
      req: chunkReq(sessionId, 1, new Uint8Array([1, 2, 3, 4])),
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 1,
    });
    expect(second.status).toBe(200);
    const buf = await readFile(chunkPath(stagingRoot, sessionId, 1));
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([1, 2, 3, 4]));
    const rows = await pg.db
      .select()
      .from(dbSchema.uploadChunks)
      .where(eq(dbSchema.uploadChunks.sessionId, sessionId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.size).toBe(4);
  });

  test("404 when the session belongs to a different user", async () => {
    const sessionId = await seedSession({ mode: "proxy", owner: otherUserId });
    const res = await handleUploadChunk({
      req: chunkReq(sessionId, 0, new Uint8Array([1])),
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 0,
    });
    expect(res.status).toBe(404);
  });

  test("400 when the session is direct-mode (belongs to presigned path)", async () => {
    const sessionId = await seedSession({ mode: "direct" });
    const res = await handleUploadChunk({
      req: chunkReq(sessionId, 0, new Uint8Array([1])),
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 0,
    });
    expect(res.status).toBe(400);
  });

  test("409 when the session is already in a terminal/ready status", async () => {
    const sessionId = await seedSession({ mode: "proxy", status: "ready" });
    const res = await handleUploadChunk({
      req: chunkReq(sessionId, 0, new Uint8Array([1])),
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 0,
    });
    expect(res.status).toBe(409);
  });

  test("400 when index is out of range", async () => {
    const sessionId = await seedSession({ mode: "proxy", totalChunks: 2 });
    const res = await handleUploadChunk({
      req: chunkReq(sessionId, 99, new Uint8Array([1])),
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 99,
    });
    expect(res.status).toBe(400);
  });

  test("400 when content-length disagrees with actual body length", async () => {
    const sessionId = await seedSession({ mode: "proxy" });
    // Lie about the length — the handler reads the real stream and compares.
    const req = new Request(
      `http://localhost/api/upload/${sessionId}/0`,
      {
        method: "PUT",
        body: new Uint8Array([1, 2, 3]),
        headers: { "content-length": "99" },
      },
    );
    const res = await handleUploadChunk({
      req,
      deps: { db: pg.db, config, log },
      userId,
      sessionId,
      index: 0,
    });
    expect(res.status).toBe(400);
  });
});
