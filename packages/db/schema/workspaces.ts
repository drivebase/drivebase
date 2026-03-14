import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";

export const workspaceAutoSyncScopeEnum = pgEnum("workspace_auto_sync_scope", [
	"all",
	"selected",
]);

/**
 * Workspaces table
 */
export const workspaces = pgTable("workspaces", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	color: text("color").notNull().default("sky"),
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	syncOperationsToProvider: boolean("sync_operations_to_provider")
		.notNull()
		.default(true),
	autoSyncEnabled: boolean("auto_sync_enabled").notNull().default(false),
	autoSyncCron: text("auto_sync_cron"),
	autoSyncScope: workspaceAutoSyncScopeEnum("auto_sync_scope")
		.notNull()
		.default("all"),
	smartSearchEnabled: boolean("smart_search_enabled").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
