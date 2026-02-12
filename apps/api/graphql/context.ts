import type { YogaInitialContext } from "graphql-yoga";
import type { Database } from "@drivebase/db";
import type { JWTPayload } from "../utils/jwt";
import { getDb } from "@drivebase/db";
import { extractToken, verifyToken } from "../utils/jwt";
import { getSession } from "../redis/session";

export interface GraphQLContext {
  /** Database client */
  db: Database;
  /** Authenticated user (null if not authenticated) */
  user: JWTPayload | null;
  /** Request headers */
  headers: Headers;
  /** Client IP address */
  ip: string;
}

/**
 * Create GraphQL context
 */
export async function createContext(
  initialContext: YogaInitialContext
): Promise<GraphQLContext> {
  const db = getDb();
  const headers = initialContext.request.headers;

  // Extract authentication token
  const token = extractToken(
    headers.get("authorization"),
    headers.get("cookie")
  );

  let user: JWTPayload | null = null;

  // Verify token and get user
  if (token) {
    try {
      // Check if session exists in Redis
      const session = await getSession(token);

      if (session) {
        // Verify JWT to ensure it's still valid
        user = await verifyToken(token);
      }
    } catch (error) {
      // Invalid token, user remains null
      console.error("Token verification failed:", error);
    }
  }

  // Get client IP
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown";

  return {
    db,
    user,
    headers,
    ip,
  };
}
