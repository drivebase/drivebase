import type { Db } from "@drivebase/db";
import type { Logger } from "@drivebase/logger";
import type { ProviderRegistry } from "@drivebase/storage";
import type { AppConfig } from "@drivebase/config";
import type { Redis } from "ioredis";
import type { AppPubSub } from "../pubsub.ts";
import type { CacheService } from "@drivebase/cache";

/** Authenticated user (pulled off the Better Auth session). */
export type AuthedUser = {
  id: string;
  email: string;
  name: string;
};

/** Everything a resolver can reach at runtime. */
export type GraphQLContext = {
  db: Db;
  log: Logger;
  registry: ProviderRegistry;
  config: AppConfig;
  pubsub: AppPubSub;
  /** Primary ioredis connection for ephemeral state (OAuth state, caches). */
  redis: Redis;
  /** Typed cache over Redis (listChildren, usage). */
  cache: CacheService;
  user: AuthedUser | null;
  /** Request id for correlating logs across a single request. */
  requestId: string;
};
