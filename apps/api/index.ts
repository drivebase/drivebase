import { readFile } from "node:fs/promises";
import { env } from "./config/env";
import { mountPluginRoutes } from "./config/providers";
import { closeUploadQueue } from "./queue/upload-queue";
import { startUploadWorker, stopUploadWorker } from "./queue/upload-worker";
import { createApp } from "./server/app";
import { mountCoreRoutes } from "./server/routes/core";
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
 * Create Hono app and mount routes
 */
const app = createApp();

// Mount core API routes
mountCoreRoutes(app);

// Mount provider plugin routes
mountPluginRoutes(app);

// Mount GraphQL Yoga
app.all("/graphql", (c) => yoga.fetch(c.req.raw));

/**
 * Start Bun server
 */
const server = Bun.serve({
	port: parseInt(env.PORT, 10),
	development: env.NODE_ENV === "development",
	fetch: app.fetch,
});

// Start BullMQ upload worker
startUploadWorker();

logger.info(`Drivebase API running on http://localhost:${server.port}/graphql`);

// Graceful shutdown
let isShuttingDown = false;

async function shutdown() {
	if (isShuttingDown) {
		return;
	}
	isShuttingDown = true;

	logger.info("Shutting down gracefully...");
	server.stop();
	await stopUploadWorker();
	await closeUploadQueue();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
