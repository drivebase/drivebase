import { nodes } from "./nodes";

/**
 * Compatibility export during files/folders -> nodes migration.
 * `folders` now points to the unified `nodes` table.
 */
export const folders = nodes;

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
