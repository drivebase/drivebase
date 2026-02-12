import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Database client singleton
 */
let dbInstance: ReturnType<typeof drizzle> | null = null;
let poolInstance: Pool | null = null;

/**
 * Get or create database client
 */
export function getDb() {
	if (!dbInstance) {
		const databaseUrl = process.env.DATABASE_URL;

		if (!databaseUrl) {
			throw new Error("DATABASE_URL environment variable is not set");
		}

		poolInstance = new Pool({
			connectionString: databaseUrl,
			max: 10, // Connection pool size
			idleTimeoutMillis: 20000,
			connectionTimeoutMillis: 10000,
		});

		dbInstance = drizzle(poolInstance, { schema });
	}

	return dbInstance;
}

/**
 * Create a new database client (for testing or migrations)
 */
export function createDb(databaseUrl: string) {
	const pool = new Pool({
		connectionString: databaseUrl,
		max: 1,
	});

	return drizzle(pool, { schema });
}

/**
 * Close database connection
 */
export async function closeDb() {
	if (poolInstance) {
		await poolInstance.end();
		poolInstance = null;
		dbInstance = null;
	}
}

export type Database = ReturnType<typeof getDb>;
