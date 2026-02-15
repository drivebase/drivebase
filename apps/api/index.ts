import { readFile } from "node:fs/promises";
import { env } from "./config/env";
import { handleDownloadProxy } from "./server/routes/download-proxy";
import { handleOAuthCallback } from "./server/routes/oauth";
import {
	handleTelegramSendCode,
	handleTelegramVerify,
	handleTelegramVerify2FA,
} from "./server/routes/telegram";
import { handleUploadProxy } from "./server/routes/upload-proxy";
import { yoga } from "./server/yoga";
import { initializeApp } from "./utils/init";
import { logger } from "./utils/logger";

/**
 * Get application version
 */
let appVersion = "unknown";
try {
	const packageJsonPath = new URL("../../package.json", import.meta.url);
	const packageJsonContent = await readFile(packageJsonPath, "utf-8");
	const packageJson = JSON.parse(packageJsonContent) as { version?: string };
	appVersion = packageJson.version ?? "unknown";
} catch (_error) {
	// Ignore error, keep version as unknown
}

logger.info(`Drivebase v${appVersion}`);

/**
 * Initialize application (create default user if needed)
 */
await initializeApp();

/**
 * Start Bun server
 */
const server = Bun.serve({
	port: parseInt(env.PORT, 10),
	development: env.NODE_ENV === "development",
	async fetch(request) {
		const url = new URL(request.url);

		// OAuth callback route
		if (request.method === "GET" && url.pathname === "/webhook/callback") {
			return handleOAuthCallback(request);
		}

		// Proxy upload route
		if (request.method === "POST" && url.pathname === "/api/upload/proxy") {
			return handleUploadProxy(request);
		}
		if (request.method === "OPTIONS" && url.pathname === "/api/upload/proxy") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": env.CORS_ORIGIN,
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Credentials": "true",
				},
			});
		}

		// Proxy download route
		if (request.method === "GET" && url.pathname === "/api/download/proxy") {
			return handleDownloadProxy(request);
		}
		if (
			request.method === "OPTIONS" &&
			url.pathname === "/api/download/proxy"
		) {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": env.CORS_ORIGIN,
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Allow-Headers": "Authorization",
					"Access-Control-Allow-Credentials": "true",
				},
			});
		}

		// Telegram auth routes
		if (
			request.method === "POST" &&
			url.pathname === "/api/telegram/send-code"
		) {
			return handleTelegramSendCode(request);
		}
		if (request.method === "POST" && url.pathname === "/api/telegram/verify") {
			return handleTelegramVerify(request);
		}
		if (
			request.method === "POST" &&
			url.pathname === "/api/telegram/verify-2fa"
		) {
			return handleTelegramVerify2FA(request);
		}
		if (
			request.method === "OPTIONS" &&
			url.pathname.startsWith("/api/telegram/")
		) {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": env.CORS_ORIGIN,
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Credentials": "true",
				},
			});
		}

		return yoga.fetch(request);
	},
});

logger.info(
	`● Drivebase API running on http://localhost:${server.port}/graphql`,
);

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("Shutting down gracefully...");
	server.stop();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	logger.info("Shutting down gracefully...");
	server.stop();
	process.exit(0);
});
