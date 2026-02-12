import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Redis client singleton
 */
let redisInstance: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisInstance.on("error", (error) => {
      logger.error({ msg: "Redis connection error", error });
    });

    redisInstance.on("connect", () => {
      logger.info("Redis connected");
    });
  }

  return redisInstance;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
