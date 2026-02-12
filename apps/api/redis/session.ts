import { getRedis } from "./client";

const SESSION_PREFIX = "session:";
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
}

/**
 * Store session data
 */
export async function createSession(token: string, data: SessionData): Promise<void> {
  const redis = getRedis();
  const key = `${SESSION_PREFIX}${token}`;

  await redis.setex(key, SESSION_TTL, JSON.stringify(data));
}

/**
 * Get session data
 */
export async function getSession(token: string): Promise<SessionData | null> {
  const redis = getRedis();
  const key = `${SESSION_PREFIX}${token}`;

  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  return JSON.parse(data as string);
}

/**
 * Delete session
 */
export async function deleteSession(token: string): Promise<void> {
  const redis = getRedis();
  const key = `${SESSION_PREFIX}${token}`;

  await redis.del(key);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  const redis = getRedis();
  const pattern = `${SESSION_PREFIX}*`;

  // Get all session keys
  const keys = await redis.keys(pattern);

  // Filter sessions for this user
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const session = JSON.parse(data as string) as SessionData;
      if (session.userId === userId) {
        await redis.del(key);
      }
    }
  }
}
