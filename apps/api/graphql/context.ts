import type { Database } from "@drivebase/db";
import { getDb } from "@drivebase/db";
import type { YogaInitialContext } from "graphql-yoga";
import { getSession } from "../redis/session";
import { validateApiKey } from "../service/api-key";
import { isApiKeyToken } from "../utils/api-key";
import type { JWTPayload } from "../utils/jwt";
import { extractToken, verifyToken } from "../utils/jwt";
import { logger } from "../utils/logger";

export interface GraphQLContext {
	/** Database client */
	db: Database;
	/** Authenticated user (null if not authenticated) */
	user: JWTPayload | null;
	/** Request headers */
	headers: Headers;
	/** Client IP address */
	ip: string;
	/** API key scopes — null for JWT sessions, string[] for API key requests */
	apiKeyScopes: string[] | null;
}

/**
 * Create GraphQL context
 */
export async function createContext(
	initialContext: YogaInitialContext,
): Promise<GraphQLContext> {
	const db = getDb();
	const headers = initialContext.request.headers;

	// Extract authentication token
	const token = extractToken(
		headers.get("authorization"),
		headers.get("cookie"),
	);

	let user: JWTPayload | null = null;
	let apiKeyScopes: string[] | null = null;

	// Verify token and get user
	if (token && isApiKeyToken(token)) {
		try {
			const result = await validateApiKey(db, token);
			if (result) {
				user = {
					userId: result.userId,
					email: result.email,
					role: result.role,
				};
				apiKeyScopes = result.scopes;
			}
		} catch (error) {
			logger.debug({ msg: "API key validation failed", error });
		}
	} else if (token) {
		try {
			// Check if session exists in Redis
			const session = await getSession(token);

			if (session) {
				// Verify JWT to ensure it's still valid
				user = await verifyToken(token);
			}
		} catch (error) {
			// Invalid token, user remains null
			logger.debug({ msg: "Token verification failed", error });
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
		apiKeyScopes,
	};
}
