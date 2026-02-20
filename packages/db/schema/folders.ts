import {
	type AnyPgColumn,
	boolean,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";
import { vaults } from "./vaults";
import { workspaces } from "./workspaces";

/**
 * Folders table
 *
 * Folders are virtual/organizational and independent from providers.
 * Only files get uploaded to providers.
 */
export const folders = pgTable("folders", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	virtualPath: text("virtual_path").notNull().unique(),
	name: text("name").notNull(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	parentId: text("parent_id").references((): AnyPgColumn => folders.id, {
		onDelete: "cascade",
	}),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	vaultId: text("vault_id").references(() => vaults.id, {
		onDelete: "cascade",
	}),
	isDeleted: boolean("is_deleted").notNull().default(false),
	starred: boolean("starred").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
