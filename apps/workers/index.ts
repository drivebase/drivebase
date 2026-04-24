import { CacheService } from "@drivebase/cache";
import { getConfig } from "./config.ts";
import { getDb } from "./db.ts";
import { closeRedis, getRedis } from "./redis.ts";
import { getLogger } from "./logger.ts";
import { getRegistry } from "./registry.ts";
import { makeQueueFactory } from "./queues.ts";
import { startWorkers } from "./workers.ts";

/**
 * Workers entrypoint. Boots config → logger → DB → Redis → registry, then
 * attaches BullMQ Workers for every job queue. SIGTERM/SIGINT trigger a
 * graceful drain: stop accepting new jobs, let in-flight finish, close
 * connections.
 */
const [config, log, { db, sql }, { primary, pub }] = await Promise.all([
  getConfig(),
  getLogger(),
  getDb(),
  getRedis(),
]);
const registry = getRegistry({ db, config });
const cache = new CacheService(primary, {
  children: config.cache.childrenTtlSeconds,
  usage: config.cache.usageTtlSeconds,
});

const workers = startWorkers({
  db,
  config,
  registry,
  log,
  primary,
  pub,
  cache,
  getQueue: makeQueueFactory(primary),
});

log.info(
  { queues: workers.map((w) => w.name), env: config.server.env },
  "drivebase workers started",
);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "drivebase workers shutting down");
  // BullMQ's worker.close() waits for active jobs to complete.
  await Promise.all(workers.map((w) => w.close()));
  await sql.end({ timeout: 5 });
  await closeRedis();
  log.info("drivebase workers stopped");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
