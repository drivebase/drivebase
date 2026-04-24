import { defineConfig } from "drizzle-kit";

// drizzle-kit runs under Node.js, so `Bun` is not defined here.
const url =
  process.env.DATABASE_URL ??
  "postgres://drivebase:drivebase@localhost:5432/drivebase?sslmode=disable";

export default defineConfig({
  schema: "./schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
