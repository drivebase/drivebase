import "./utils/polyfill";
import { readFile } from "node:fs/promises";
import { ensureVectorExtension, getDb } from "@drivebase/db";
import { env } from "./config/env";
import { mountPluginRoutes } from "./config/providers";
import { registry } from "./queue/index";
import { createApp } from "./server/app";
import { mountCoreRoutes } from "./server/routes/core";
import { yoga } from "./server/yoga";
import { reconcileWorkspaceAutoSyncSchedules } from "./service/workspace";
import { isFirstRun, telemetry } from "./telemetry";
import { initializeApp } from "./utils/runtime/init";
import { logger } from "./utils/runtime/logger";

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

if (isFirstRun && env.NODE_ENV === "production") {
	const grey = "\x1b[90m";
	const reset = "\x1b[0m";
	console.log(`
${grey}  Drivebase collects anonymous usage telemetry to help improve the product.
  No personal data, file names, or file content is ever collected.
  To opt out, set: DRIVEBASE_TELEMETRY=false
  Learn more:      https://drivebase.dev/docs/telemetry${reset}
`);
}

await ensureVectorExtension();

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
	// GraphQL subscriptions/SSE can stay open without immediate traffic.
	// Bun defaults to 10s, which is too low and causes request timeout logs.
	idleTimeout: 120,
	fetch: app.fetch,
});

// Start BullMQ workers
registry.startAll();

await reconcileWorkspaceAutoSyncSchedules(getDb());

logger.info(`Drivebase API running on http://localhost:${env.PORT}`);

telemetry.capture("server_started", { version: appVersion });

// Graceful shutdown
let isShuttingDown = false;

async function shutdown() {
	if (isShuttingDown) {
		return;
	}
	isShuttingDown = true;

	logger.info("Shutting down gracefully...");
	server.stop();
	await registry.stopAll();
	telemetry.capture("server_shutdown");
	await telemetry.shutdown();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
