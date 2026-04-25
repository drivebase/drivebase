import type { AppConfig } from "@drivebase/config";
import type { Logger } from "@drivebase/logger";
import { createTelemetryClient } from "@drivebase/telemetry";
import { getAuth } from "~/auth/better-auth.ts";
import { getDb } from "~/db.ts";
import { getConfig } from "~/config.ts";
import { getLogger } from "~/logger.ts";
import { getRegistry } from "~/providers/registry.ts";
import { getRedis } from "~/redis/client.ts";
import { pubsub } from "~/pubsub.ts";
import { CacheService } from "@drivebase/cache";
import type { GraphQLContext } from "./context.ts";

/** Build a GraphQL context for one HTTP request. */
export async function buildContext(req: Request): Promise<GraphQLContext> {
  const [config, { db }, baseLog, auth, { primary: redis }] =
    await Promise.all([
      getConfig(),
      getDb(),
      getLogger(),
      getAuth(),
      getRedis(),
    ]);

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const log = baseLog.child({ requestId });

  const session = await auth.api.getSession({ headers: req.headers });

  const cache = new CacheService(redis, {
    children: config.cache.childrenTtlSeconds,
    usage: config.cache.usageTtlSeconds,
  });

  const telemetry = createTelemetryClient({
    disabled: process.env.TELEMETRY_DISABLED === 'true',
  });

  return {
    db,
    log,
    config: config satisfies AppConfig,
    registry: getRegistry({ db, config }),
    pubsub,
    redis,
    cache,
    telemetry,
    requestId,
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        }
      : null,
  } satisfies Omit<GraphQLContext, "log"> & { log: Logger };
}
