import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { schema } from "@drivebase/db";
import { getConfig } from "~/config.ts";
import { getDb } from "~/db.ts";

export type Auth = Awaited<ReturnType<typeof build>>;

async function build() {
  const cfg = await getConfig();
  const { db } = await getDb();
  return betterAuth({
    baseURL: cfg.auth.baseUrl,
    basePath: "/auth",
    secret: cfg.auth.betterAuthSecret,
    trustedOrigins: cfg.auth.trustedOrigins,
    emailAndPassword: { enabled: true },
    database: drizzleAdapter(db, { provider: "pg", schema }),
  });
}

let cached: Promise<Auth> | undefined;

/**
 * Singleton Better Auth instance. Email+password with the Drizzle adapter
 * wired to our Postgres schema (`user`, `session`, `account`, `verification`
 * tables live in `@drivebase/db`).
 */
export function getAuth(): Promise<Auth> {
  if (!cached) cached = build();
  return cached;
}

export type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;
