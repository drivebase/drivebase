import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.ts";

export type Db = PostgresJsDatabase<typeof schema>;
export type Sql = ReturnType<typeof postgres>;

export type CreateDbOptions = {
  url: string;
  /** Passed through to postgres-js. */
  max?: number;
  /** Passed through to postgres-js. */
  idleTimeout?: number;
};

export function createDb(opts: CreateDbOptions): { db: Db; sql: Sql } {
  const sql = postgres(opts.url, {
    max: opts.max ?? 10,
    idle_timeout: opts.idleTimeout ?? 30,
    prepare: false,
  });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export { schema };
