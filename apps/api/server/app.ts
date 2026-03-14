import { Hono } from "hono";
import { cors } from "hono/cors";
import type {
	WebDavAuthResult,
	WebDavResolvedProviderScope,
} from "@/service/webdav/shared/types";
import { env } from "../config/env";
import { getAppUrl } from "../config/url";
import type { JWTPayload } from "../utils/auth/jwt";
import { logger } from "../utils/runtime/logger";

/**
 * Hono app environment with typed context variables
 */
export type AppEnv = {
	Variables: {
		user: JWTPayload;
		apiKeyScopes: string[] | null;
		apiKeyProviderScopes: { providerId: string; basePath: string }[] | null;
		webdavPrincipal: WebDavAuthResult | null;
		webdavScopes: WebDavResolvedProviderScope[] | null;
	};
};

/**
 * Create Hono application with global CORS middleware
 */
export function createApp(): Hono<AppEnv> {
	const app = new Hono<AppEnv>();
	const corsMiddleware = cors({
		origin: (origin) => {
			if (env.NODE_ENV === "development" && origin?.includes("localhost")) {
				return origin;
			}
			return getAppUrl();
		},
		credentials: true,
		allowMethods: ["POST", "GET", "PUT", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
		exposeHeaders: ["Content-Disposition"],
	});

	app.use("/dav", async (c, next) => {
		logger.debug({
			msg: "API received WebDAV request",
			method: c.req.method,
			path: c.req.path,
			userAgent: c.req.header("user-agent") ?? null,
			origin: c.req.header("origin") ?? null,
		});
		await next();
	});

	app.use("/dav/*", async (c, next) => {
		logger.debug({
			msg: "API received WebDAV request",
			method: c.req.method,
			path: c.req.path,
			userAgent: c.req.header("user-agent") ?? null,
			origin: c.req.header("origin") ?? null,
		});
		await next();
	});

	// Global CORS middleware
	app.use("*", async (c, next) => {
		if (c.req.path === "/dav" || c.req.path.startsWith("/dav/")) {
			await next();
			return;
		}

		return corsMiddleware(c, next);
	});

	return app;
}
