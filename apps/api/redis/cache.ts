import { getRedis } from "./client";

const CACHE_PREFIX = "cache:";
const DEFAULT_TTL = 5 * 60; // 5 minutes

/**
 * Set cache value
 */
export async function setCache(
  key: string,
  value: string | Record<string, unknown>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  const redis = getRedis();
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const data = typeof value === "string" ? value : JSON.stringify(value);

  await redis.setex(cacheKey, ttlSeconds, data);
}

/**
 * Get cache value
 */
export async function getCache<T = string>(key: string): Promise<T | null> {
  const redis = getRedis();
  const cacheKey = `${CACHE_PREFIX}${key}`;

  const data = await redis.get(cacheKey);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data as string) as T;
  } catch {
    return data as T;
  }
}

/**
 * Delete cache value
 */
export async function deleteCache(key: string): Promise<void> {
  const redis = getRedis();
  const cacheKey = `${CACHE_PREFIX}${key}`;

  await redis.del(cacheKey);
}

/**
 * Delete cache values by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  const cachePattern = `${CACHE_PREFIX}${pattern}`;

  const keys = await redis.keys(cachePattern);

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
