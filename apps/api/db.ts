import { createDb, type Db, type Sql } from "@drivebase/db";
import { getConfig } from "./config.ts";

let cached: { db: Db; sql: Sql } | undefined;

export async function getDb(): Promise<{ db: Db; sql: Sql }> {
  if (cached) return cached;
  const cfg = await getConfig();
  cached = createDb({ url: cfg.db.url });
  return cached;
}
