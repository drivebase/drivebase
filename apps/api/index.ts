import { createYoga } from "graphql-yoga";
import { getConfig } from "~/config.ts";
import { getLogger } from "~/logger.ts";
import { getAuth } from "~/auth/better-auth.ts";
import { buildSchema } from "~/graphql/schema.ts";
import { buildContext } from "~/graphql/context-factory.ts";
import type { GraphQLContext } from "~/graphql/context.ts";
import { getRedis } from "~/redis/client.ts";
import { startRedisBridge } from "~/bridge.ts";
import { getDb } from "~/db.ts";
import {
  handleUploadChunk,
  matchUploadChunkRoute,
} from "~/rest/upload-chunk.ts";
import {
  handleDownloadNode,
  matchDownloadNodeRoute,
} from "~/rest/download-node.ts";
import {
  handleOAuthCallback,
  matchOAuthCallbackRoute,
} from "~/rest/oauth-callback.ts";
import { getRegistry } from "~/providers/registry.ts";

const [config, log, auth, schema, { primary: redis, sub }, { db }] = await Promise.all([
  getConfig(),
  getLogger(),
  getAuth(),
  buildSchema(),
  getRedis(),
  getDb(),
]);
const registry = getRegistry({ db, config });

// Attach the Redis → PubSub bridge before we start serving. Workers may
// already be pushing progress events; PSUBSCRIBE buffers nothing, so any
// events fired before this line are lost (acceptable — operations aren't
// running until after API boot in normal flow).
await startRedisBridge({ sub, log });

const yoga = createYoga<{ request: Request }, GraphQLContext>({
  schema,
  graphiql: config.server.env === "dev",
  landingPage: false,
  context: ({ request }) => buildContext(request),
  graphqlEndpoint: "/graphql",
  // CORS is handled at the Bun.serve layer so Better Auth + GraphQL see the
  // same policy.
  cors: false,
  logging: {
    debug: (...args) => log.debug({ args }, "yoga.debug"),
    info: (...args) => log.info({ args }, "yoga.info"),
    warn: (...args) => log.warn({ args }, "yoga.warn"),
    error: (...args) => log.error({ args }, "yoga.error"),
  },
  // Log detailed error information for debugging
  maskedErrors: {
    maskError(error: unknown, message: string, isDev?: boolean) {
      if (error instanceof Error) {
        log.error({
          error: error.message,
          stack: error.stack,
          name: error.name,
        }, "graphql error");
        return error;
      }
      log.error({ error }, "graphql error");
      return new Error(message);
    },
  },
});

const allowedOrigins = new Set([
  config.auth.baseUrl,
  ...config.auth.trustedOrigins,
]);

function cors(req: Request, res: Response): Response {
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    res.headers.set("access-control-allow-origin", origin);
    res.headers.set("access-control-allow-credentials", "true");
    res.headers.set("vary", "origin");
  }
  return res;
}

const server = Bun.serve({
  port: config.server.port,
  hostname: config.server.host,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      const res = new Response(null, { status: 204 });
      res.headers.set(
        "access-control-allow-methods",
        "GET,POST,PUT,DELETE,OPTIONS",
      );
      res.headers.set(
        "access-control-allow-headers",
        "content-type,authorization,x-request-id",
      );
      res.headers.set("access-control-max-age", "86400");
      return cors(req, res);
    }

    if (url.pathname === "/healthz") {
      return cors(req, new Response("ok", { status: 200 }));
    }

    if (url.pathname.startsWith("/auth/")) {
      return cors(req, await auth.handler(req));
    }

    if (url.pathname === "/graphql" || url.pathname === "/graphql/") {
      return cors(req, await yoga.fetch(req));
    }

    if (matchOAuthCallbackRoute(req)) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session?.user) {
        return cors(
          req,
          new Response("Sign in to Drivebase first, then retry.", {
            status: 401,
            headers: { "content-type": "text/plain; charset=utf-8" },
          }),
        );
      }
      return cors(
        req,
        await handleOAuthCallback({
          req,
          userId: session.user.id,
          deps: { db, config, registry, redis, log },
        }),
      );
    }

    const uploadRoute = matchUploadChunkRoute(req);
    if (uploadRoute) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session?.user) {
        return cors(req, Response.json({ error: "unauthenticated" }, { status: 401 }));
      }
      const res = await handleUploadChunk({
        req,
        deps: { db, config, log },
        userId: session.user.id,
        sessionId: uploadRoute.sessionId,
        index: uploadRoute.index,
      });
      return cors(req, res);
    }

    const downloadRoute = matchDownloadNodeRoute(req);
    if (downloadRoute) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session?.user) {
        return cors(req, Response.json({ error: "unauthenticated" }, { status: 401 }));
      }
      const res = await handleDownloadNode({
        deps: { db, config, registry, log },
        userId: session.user.id,
        nodeId: downloadRoute.nodeId,
      });
      return cors(req, res);
    }

    return cors(req, new Response("not found", { status: 404 }));
  },
});

log.info(
  { port: server.port, env: config.server.env },
  `drivebase api listening on http://${config.server.host}:${server.port}`,
);
