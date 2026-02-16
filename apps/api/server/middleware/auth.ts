import type { Context, Next } from "hono";
import { verifyToken } from "../../utils/jwt";
import type { AppEnv } from "../app";

/**
 * Authentication middleware for protected routes
 * Verifies JWT token from Authorization header and sets user in context
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

	try {
		const payload = await verifyToken(token);
		c.set("user", payload);
		await next();
	} catch (_error) {
		return c.json({ error: "Invalid token" }, 401);
	}
}
