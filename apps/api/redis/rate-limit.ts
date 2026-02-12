import { getRedis } from "./client";
import { RateLimitError } from "@drivebase/core";

const RATE_LIMIT_PREFIX = "rate:";

export interface RateLimitConfig {
  /** Maximum requests allowed */
  max: number;
  /** Window in seconds */
  windowSeconds: number;
}

/**
 * Check and increment rate limit
 * @throws RateLimitError if limit exceeded
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  const redis = getRedis();
  const rateLimitKey = `${RATE_LIMIT_PREFIX}${key}`;

  // Get current count
  const current = await redis.get(rateLimitKey);
  const count = current ? parseInt(current as string, 10) : 0;

  if (count >= config.max) {
    throw new RateLimitError("Too many requests, please try again later", {
      limit: config.max,
      window: config.windowSeconds,
    });
  }

  // Increment count
  const newCount = await redis.incr(rateLimitKey);

  // Set expiry on first request
  if (newCount === 1) {
    await redis.expire(rateLimitKey, config.windowSeconds);
  }
}

/**
 * Common rate limit configurations
 */
export const RateLimits = {
  /** Auth endpoints: 5 requests per 15 minutes */
  AUTH: { max: 5, windowSeconds: 15 * 60 },
  /** API calls: 100 requests per minute */
  API: { max: 100, windowSeconds: 60 },
  /** File upload: 10 requests per hour */
  UPLOAD: { max: 10, windowSeconds: 60 * 60 },
} as const;
