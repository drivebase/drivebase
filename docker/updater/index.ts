import { getStatus, logger, performUpdate } from "./updater";

const UPDATER_SECRET = process.env.UPDATER_SECRET;
const PORT = Number(process.env.PORT) || 4500;

function authorize(request: Request): boolean {
	if (!UPDATER_SECRET) return true; // No secret configured = open (dev mode)
	const auth = request.headers.get("authorization");
	return auth === `Bearer ${UPDATER_SECRET}`;
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);

		// Health check — no auth required
		if (request.method === "GET" && url.pathname === "/health") {
			return json({ ok: true });
		}

		// All other endpoints require auth
		if (!authorize(request)) {
			logger.warn({ path: url.pathname }, "Unauthorized request");
			return json({ error: "Unauthorized" }, 401);
		}

		// GET /status — return current update state
		if (request.method === "GET" && url.pathname === "/status") {
			return json(getStatus());
		}

		// POST /update — trigger the update flow
		if (request.method === "POST" && url.pathname === "/update") {
			const status = getStatus();
			if (status.status === "pulling" || status.status === "restarting") {
				logger.warn({ status: status.status }, "Update already in progress");
				return json({ error: "Update already in progress", ...status }, 409);
			}

			let targetVersion: string | undefined;
			try {
				const body = (await request.json()) as {
					targetVersion?: string;
				};
				targetVersion = body.targetVersion;
			} catch {
				// No body or invalid JSON — use default (latest)
			}

			logger.info(
				{ targetVersion: targetVersion ?? "latest" },
				"Update triggered",
			);

			// Fire and forget — the update runs in the background
			performUpdate(targetVersion).catch((err: unknown) => {
				logger.error({ err }, "Background update failed");
			});

			return json(getStatus());
		}

		logger.warn({ method: request.method, path: url.pathname }, "Not found");
		return json({ error: "Not found" }, 404);
	},
});

logger.info({ port: PORT }, "Updater sidecar listening");

function shutdown() {
	logger.info("Shutting down");
	server.stop(true);
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
