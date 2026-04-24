import { Redis } from "ioredis";
import { getConfig } from "../config.ts";

/**
 * Three ioredis connections:
 *   - primary: commands (GET/SET/DEL, scripts, stream XADD, etc.)
 *   - publisher: PUBLISH only
 *   - subscriber: (P)SUBSCRIBE only — ioredis puts a connection in subscribe
 *     mode, so it can't be reused for regular commands.
 *
 * Holding them here means the API has a single well-known place for Redis.
 * Workers get their own pool — they import ioredis directly.
 */
type RedisTriple = { primary: Redis; pub: Redis; sub: Redis };

let cached: RedisTriple | undefined;

export async function getRedis(): Promise<RedisTriple> {
  if (cached) return cached;
  const cfg = await getConfig();
  const opts = { maxRetriesPerRequest: null, enableReadyCheck: true };
  cached = {
    primary: new Redis(cfg.redis.url, opts),
    pub: new Redis(cfg.redis.url, opts),
    sub: new Redis(cfg.redis.url, opts),
  };
  return cached;
}

export async function closeRedis(): Promise<void> {
  if (!cached) return;
  await Promise.all([
    cached.primary.quit(),
    cached.pub.quit(),
    cached.sub.quit(),
  ]);
  cached = undefined;
}
