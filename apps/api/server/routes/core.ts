import type { Hono } from "hono";
import type { AppEnv } from "../app";
import { authMiddleware } from "../middleware/auth";
import { handleDownloadLink } from "./download-link";
import { handleDownloadProxy } from "./download-proxy";
import { handleExport } from "./export";
import { handleOAuthCallback } from "./oauth";
import { handlePreviewProxy } from "./preview-proxy";
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
	app.get("/api/download/link", handleDownloadLink);

	// Preview route (with auth) — inline streaming for image/* and text/*
	app.get("/api/preview", authMiddleware, handlePreviewProxy);

	// Export route (with auth)
	app.get("/api/export", authMiddleware, handleExport);

	// OAuth callback (no auth - external redirect)
	app.get("/webhook/callback", handleOAuthCallback);
}
