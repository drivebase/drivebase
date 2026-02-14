import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { join } from "node:path";

const databaseUrl =
	process.env.DATABASE_URL ||
	"postgres://postgres:postgres@localhost:5432/postgres";

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

const migrationsFolder = join(import.meta.dir, "migrations");

console.log("Running migrations from:", migrationsFolder);

await migrate(db, { migrationsFolder });
await pool.end();

console.log("Migrations complete.");
