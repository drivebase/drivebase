import { getStatus, logger, performUpdate } from "./updater";

const UPDATER_SECRET = Bun.env.UPDATER_SECRET;
const PORT = Number(Bun.env.PORT) || 4500;

function authorize(request: Request): boolean {
  if (!UPDATER_SECRET) return true;
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

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    if (!authorize(request)) {
      logger.warn({ path: url.pathname }, "Unauthorized request");
      return json({ error: "Unauthorized" }, 401);
    }

    if (request.method === "GET" && url.pathname === "/status") {
      return json(getStatus());
    }

    if (request.method === "POST" && url.pathname === "/update") {
      const status = getStatus();
      if (status.status === "pulling" || status.status === "restarting") {
        return json({ error: "Update already in progress", ...status }, 409);
      }

      let targetVersion: string | undefined;
      try {
        const body = (await request.json()) as { targetVersion?: string };
        targetVersion = body.targetVersion;
      } catch {
        // no body — use latest
      }

      logger.info({ targetVersion: targetVersion ?? "latest" }, "Update triggered");

      performUpdate(targetVersion).catch((err: unknown) => {
        logger.error({ err }, "Background update failed");
      });

      return json(getStatus());
    }

    return json({ error: "Not found" }, 404);
  },
});

logger.info({ port: PORT }, "Updater listening");

function shutdown() {
  logger.info("Shutting down");
  server.stop(true);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
