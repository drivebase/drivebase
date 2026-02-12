import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Run database migrations
 */
async function runMigrations() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error("DATABASE_URL environment variable is not set");
		process.exit(1);
	}

	console.log("Running migrations...");

	const pool = new Pool({
		connectionString: databaseUrl,
		max: 1,
	});

	const db = drizzle(pool);

	try {
		await migrate(db, { migrationsFolder: "./migrations" });
		console.log("Migrations completed successfully");
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

runMigrations();
