import type { Hono } from "hono";
import type { AppEnv } from "../app";
import { authMiddleware } from "../middleware/auth";
import { handleDownloadProxy } from "./download-proxy";
import { handleOAuthCallback } from "./oauth";
import { handleUploadChunk } from "./upload-chunk";
import { handleUploadProxy } from "./upload-proxy";

/**
 * Mount core API routes to Hono app
 */
export function mountCoreRoutes(app: Hono<AppEnv>): void {
	// Upload routes (with auth)
	app.post("/api/upload/proxy", authMiddleware, handleUploadProxy);
	app.post("/api/upload/chunk", authMiddleware, handleUploadChunk);

	// Download routes (with auth)
	app.get("/api/download/proxy", authMiddleware, handleDownloadProxy);

	// OAuth callback (no auth - external redirect)
	app.get("/webhook/callback", handleOAuthCallback);
}
