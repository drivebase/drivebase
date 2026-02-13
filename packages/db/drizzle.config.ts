import { joinPath } from "@drivebase/core";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const ENV_PATH = joinPath("../../.env.local");
config({ path: ENV_PATH });

export default defineConfig({
	schema: "./schema/index.ts",
	out: "./migrations",
	dialect: "postgresql",
	dbCredentials: {
		url:
			process.env.DATABASE_URL ||
			"postgres://postgres:postgres@localhost:5432/postgres",
	},
	verbose: true,
	strict: true,
});
