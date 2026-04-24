import { createDb, type Db, type Sql } from "@drivebase/db";
import { getConfig } from "./config.ts";

let cached: { db: Db; sql: Sql } | undefined;

/**
 * Single Db/postgres-js handle for the worker process. Workers mostly write
 * (status updates, byte counters), so a smaller pool is fine.
 */
export async function getDb(): Promise<{ db: Db; sql: Sql }> {
  if (cached) return cached;
  const cfg = await getConfig();
  cached = createDb({ url: cfg.db.url, max: 8 });
  return cached;
}
