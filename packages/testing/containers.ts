import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import { MinioContainer, type StartedMinioContainer } from "@testcontainers/minio";
import { Wait } from "testcontainers";

/**
 * On Bun, dockerode's hijacked exec stream never emits `end`, so the
 * default wait strategy `Wait.forListeningPorts()` (which shells into
 * the container via `exec`) hangs forever. We substitute log-based waits
 * everywhere — those stream container stdout/stderr, which Bun handles
 * correctly.
 */
import postgres from "postgres";
import { createDb, type Db } from "@drivebase/db";
import { Redis, type RedisOptions } from "ioredis";

/**
 * Resolve the path to the migrations folder from the @drivebase/db package.
 * We go up from this file to packages/testing, then over to packages/db.
 */
function migrationsFolder(): string {
  return resolve(
    fileURLToPath(new URL(".", import.meta.url)),
    "..",
    "db",
    "migrations",
  );
}

/**
 * Apply every `0000_*.sql` → `NNNN_*.sql` migration by executing the raw
 * SQL against the connection. Drizzle's built-in migrator uses an
 * advisory-lock dance we don't need for an ephemeral test DB.
 * Each file is sent as one simple query — postgres-js with `prepare: false`
 * supports multi-statement bodies, and `--> statement-breakpoint` is a
 * `--` line comment that Postgres ignores.
 */
async function applyMigrations(url: string): Promise<void> {
  const folder = migrationsFolder();
  const files = readdirSync(folder)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    for (const file of files) {
      const body = await readFile(resolve(folder, file), "utf8");
      await sql.unsafe(body);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export type PostgresHarness = {
  container: StartedPostgreSqlContainer;
  url: string;
  db: Db;
  stop: () => Promise<void>;
};

/**
 * Spin up an ephemeral Postgres container, apply drizzle migrations, and
 * return a live Db handle. Call `stop()` in `afterAll` to tear down.
 *
 * Note: pulls the image on first run; subsequent runs are cached by docker.
 */
export async function startPostgres(opts?: {
  image?: string;
}): Promise<PostgresHarness> {
  const container = await new PostgreSqlContainer(
    opts?.image ?? "postgres:17-alpine",
  )
    .withDatabase("drivebase_test")
    .withUsername("drivebase")
    .withPassword("drivebase")
    // Count 2: initdb emits the "ready" line during bootstrap, then again
    // after the real server starts. Only the second is serving queries.
    .withWaitStrategy(
      Wait.forLogMessage(
        /database system is ready to accept connections/,
        2,
      ),
    )
    .start();

  const url = container.getConnectionUri();

  await applyMigrations(url);

  const { db, sql } = createDb({ url, max: 4 });

  return {
    container,
    url,
    db,
    stop: async () => {
      await sql.end();
      await container.stop();
    },
  };
}

/**
 * Create an ioredis client connected to the harness, wait for it to fully
 * finish handshaking, and install a no-op `error` listener so ioredis's
 * startup-race reconnect attempts don't print "Unhandled error event"
 * during the brief window between container-ready-log and port-acceptance.
 *
 * Use this in every integration test instead of `new Redis(url, opts)`
 * directly — tests that publish/psubscribe immediately after construction
 * can otherwise race the very first connect.
 */
export async function connectRedis(
  url: string,
  opts: RedisOptions = { maxRetriesPerRequest: null },
): Promise<Redis> {
  const client = new Redis(url, opts);
  client.on("error", () => {
    // Swallow reconnect noise; real errors surface on the awaiting command.
  });
  if (client.status !== "ready") {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        client.off("end", onEnd);
        resolve();
      };
      const onEnd = () => {
        client.off("ready", onReady);
        reject(new Error("redis client disconnected before ready"));
      };
      client.once("ready", onReady);
      client.once("end", onEnd);
    });
  }
  return client;
}

export type RedisHarness = {
  container: StartedRedisContainer;
  url: string;
  host: string;
  port: number;
  client: Redis;
  stop: () => Promise<void>;
};

/**
 * Ephemeral Redis for BullMQ / PubSub tests. Returns a single ioredis
 * client configured with `maxRetriesPerRequest: null` so BullMQ is happy.
 */
export async function startRedis(opts?: {
  image?: string;
}): Promise<RedisHarness> {
  const container = await new RedisContainer(opts?.image ?? "redis:7-alpine")
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .start();
  const host = container.getHost();
  const port = container.getFirstMappedPort();
  const url = `redis://${host}:${port}`;

  const client = await connectRedis(url);

  return {
    container,
    url,
    host,
    port,
    client,
    stop: async () => {
      client.disconnect();
      await container.stop();
    },
  };
}

export type MinioHarness = {
  container: StartedMinioContainer;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  stop: () => Promise<void>;
};

/**
 * Ephemeral MinIO for S3 contract tests. Accepts any bucket; create it
 * in the test via the S3 SDK.
 */
export async function startMinio(opts?: {
  image?: string;
  accessKey?: string;
  secretKey?: string;
}): Promise<MinioHarness> {
  const accessKey = opts?.accessKey ?? "drivebase";
  const secretKey = opts?.secretKey ?? "drivebasepass";

  const container = await new MinioContainer(
    opts?.image ?? "minio/minio:latest",
  )
    .withUsername(accessKey)
    .withPassword(secretKey)
    // MinIO prints `API:` followed by its S3 endpoint once routable.
    .withWaitStrategy(Wait.forLogMessage(/API:\s/))
    .start();

  const host = container.getHost();
  const port = container.getFirstMappedPort();
  const endpoint = `http://${host}:${port}`;

  return {
    container,
    endpoint,
    accessKey,
    secretKey,
    stop: async () => {
      await container.stop();
    },
  };
}
