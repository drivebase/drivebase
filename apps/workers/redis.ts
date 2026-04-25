import { Redis } from "ioredis";
import { getConfig } from "./config.ts";

/**
 * Worker Redis pool. `primary` is used by BullMQ Workers/Queues (BullMQ needs
 * `maxRetriesPerRequest: null`). `pub` is a separate connection for the
 * progress publisher so blocking BullMQ commands never contend with PUBLISH.
 */
type RedisPair = { primary: Redis; pub: Redis };

let cached: RedisPair | undefined;

export async function getRedis(): Promise<RedisPair> {
  if (cached) return cached;
  const cfg = await getConfig();
  const opts = { maxRetriesPerRequest: null, enableReadyCheck: true };
  const noop = () => {};
  cached = {
    primary: new Redis(cfg.redis.url, opts).on('error', noop),
    pub: new Redis(cfg.redis.url, opts).on('error', noop),
  };
  return cached;
}

export async function closeRedis(): Promise<void> {
  if (!cached) return;
  await Promise.all([cached.primary.quit(), cached.pub.quit()]);
  cached = undefined;
}
