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
			logger.debug("Redis connected");
		});
	}

	return redisInstance;
}

/**
 * Create a new Redis connection suitable for BullMQ.
 * BullMQ requires maxRetriesPerRequest to be null.
 */
export function createBullMQConnection(): Redis {
	return new Redis(env.REDIS_URL, {
		maxRetriesPerRequest: null,
		enableReadyCheck: true,
		lazyConnect: false,
	});
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
