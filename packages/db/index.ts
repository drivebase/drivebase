/**
 * @drivebase/db
 *
 * Database schema and client for Drivebase using Drizzle ORM
 */

// Export database client
export { getDb, createDb, closeDb, type Database } from "./client";

// Export all schema tables and types
export * from "./schema";

// Export utilities
export { createId } from "./utils";
