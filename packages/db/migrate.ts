#!/usr/bin/env bun
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const url =
  Bun.env.DATABASE_URL ??
  "postgres://drivebase:drivebase@localhost:5432/drivebase?sslmode=disable";

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql);

console.log(`applying migrations from ${migrationsFolder}`);
await migrate(db, { migrationsFolder });
console.log("migrations applied");
await sql.end();
