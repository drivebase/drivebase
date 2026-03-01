import { getDb } from "@drivebase/db";
import type { Context, Next } from "hono";
import { validateApiKey } from "../../service/api-key";
import { isApiKeyToken } from "../../utils/api-key";
import { verifyToken } from "../../utils/jwt";
import type { AppEnv } from "../app";

/**
 * Authentication middleware for protected routes
 * Supports both JWT tokens and API keys (drv_ prefix)
 */
export async function authMiddleware(
	c: Context<AppEnv>,
	next: Next,
): Promise<Response | undefined> {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const token = authHeader.split(" ")[1];
	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (isApiKeyToken(token)) {
		const db = getDb();
		const result = await validateApiKey(db, token);
		if (!result) {
			return c.json({ error: "Invalid or expired API key" }, 401);
		}
		c.set("user", {
			userId: result.userId,
			email: result.email,
			role: result.role,
		});
		c.set("apiKeyScopes", result.scopes);
		await next();
		return;
	}

	try {
		const payload = await verifyToken(token);
		c.set("user", payload);
		c.set("apiKeyScopes", null);
		await next();
	} catch (_error) {
		return c.json({ error: "Invalid token" }, 401);
	}
}
