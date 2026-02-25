import { nodes } from "./nodes";

/**
 * Compatibility export during files/folders -> nodes migration.
 * `files` now points to the unified `nodes` table.
 */
export const files = nodes;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
