import {
	type AnyPgColumn,
	boolean,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { storageProviders } from "./providers";
import { users } from "./users";
import { vaults } from "./vaults";
import { workspaces } from "./workspaces";

/**
 * Folders table
 *
 * Folders are provider-backed. Each folder has a providerId and remoteId
 * linking it to an actual folder on a storage provider.
 */
export const folders = pgTable(
	"folders",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		virtualPath: text("virtual_path").notNull(),
		name: text("name").notNull(),
		remoteId: text("remote_id").notNull(),
		providerId: text("provider_id")
			.notNull()
			.references(() => storageProviders.id, { onDelete: "cascade" }),
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
	},
	(t) => [
		unique("folders_remote_id_provider_id_unique").on(t.remoteId, t.providerId),
	],
);

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
