#!/usr/bin/env bun
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

async function getDbUrl(): Promise<string> {
  if (Bun.env.DATABASE_URL) return Bun.env.DATABASE_URL;
  const configPath = Bun.env.DRIVEBASE_CONFIG ?? "./config.toml";
  const file = Bun.file(configPath);
  if (await file.exists()) {
    const cfg = parseToml(await file.text()) as { db?: { url?: string } };
    if (cfg.db?.url) return cfg.db.url;
  }
  return "postgres://drivebase:drivebase@localhost:5432/drivebase?sslmode=disable";
}

const url = await getDbUrl();

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
