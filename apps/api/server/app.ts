import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "../config/env";
import type { JWTPayload } from "../utils/jwt";

/**
 * Hono app environment with typed context variables
 */
export type AppEnv = {
	Variables: {
		user: JWTPayload;
	};
};

/**
 * Create Hono application with global CORS middleware
 */
export function createApp(): Hono<AppEnv> {
	const app = new Hono<AppEnv>();

	// Global CORS middleware
	app.use(
		"*",
		cors({
			origin: (origin) => {
				if (env.NODE_ENV === "development" && origin?.includes("localhost")) {
					return origin;
				}
				return env.CORS_ORIGIN;
			},
			credentials: true,
			allowMethods: ["POST", "GET", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization", "x-workspace-id"],
		}),
	);

	return app;
}
