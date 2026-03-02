/**
 * @drivebase/db
 *
 * Database schema and client for Drivebase using Drizzle ORM
 */

import { sql } from "drizzle-orm";
import { getDb } from "./client";

// Export database client
export { closeDb, createDb, type Database, getDb } from "./client";
// Export rule matching utilities
export {
	type FileAttributes,
	matchesRule,
	matchFileRule,
} from "./rule-matcher";
// Export all schema tables and types
export * from "./schema";
// Export utilities
export { createId } from "./utils";

export async function ensureVectorExtension() {
	const db = getDb();
	await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
}
