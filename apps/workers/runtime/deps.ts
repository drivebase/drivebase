import type { CacheService } from "@drivebase/cache";
import type { AppConfig } from "@drivebase/config";
import type { Db } from "@drivebase/db";
import type { Logger } from "@drivebase/logger";
import type { ProviderRegistry, QueueName } from "@drivebase/storage";
import type { Queue } from "bullmq";
import type { Redis } from "ioredis";

/** Dependencies threaded into every handler. */
export type WorkerDeps = {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
  log: Logger;
  primary: Redis;
  pub: Redis;
  cache: CacheService;
  /** Returns a cached BullMQ Queue for the given queue name. */
  getQueue: (name: QueueName) => Promise<Queue>;
};
