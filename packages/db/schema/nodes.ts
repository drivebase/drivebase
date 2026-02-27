import {
	bigint,
	boolean,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { storageProviders } from "./providers";
import { users } from "./users";
import { vaults } from "./vaults";
import { workspaces } from "./workspaces";

export const nodeTypeEnum = pgEnum("node_type", ["file", "folder"]);
export const fileLifecycleStateEnum = pgEnum("file_lifecycle_state", [
	"hot",
	"archived",
	"restore_requested",
	"restoring",
	"restored_temporary",
	"unknown",
]);

/**
 * Unified metadata node table (file + folder).
 *
 * Notes:
 * - `folderId` mirrors legacy file parent relationship.
 * - `parentId` mirrors legacy folder parent relationship.
 *   During migration we keep both for compatibility with existing services.
 */
export const nodes = pgTable(
	"nodes",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		nodeType: nodeTypeEnum("node_type").notNull(),
		virtualPath: text("virtual_path").notNull(),
		name: text("name").notNull(),
		remoteId: text("remote_id").notNull(),
		providerId: text("provider_id")
			.notNull()
			.references(() => storageProviders.id, { onDelete: "cascade" }),
		workspaceId: text("workspace_id").references(() => workspaces.id, {
			onDelete: "cascade",
		}),
		// Legacy compatibility parent pointers
		folderId: text("folder_id"),
		parentId: text("parent_id"),
		// Legacy compatibility actor pointers
		uploadedBy: text("uploaded_by").references(() => users.id, {
			onDelete: "cascade",
		}),
		createdBy: text("created_by").references(() => users.id, {
			onDelete: "cascade",
		}),
		vaultId: text("vault_id").references(() => vaults.id, {
			onDelete: "cascade",
		}),
		// File-specific metadata (nullable for folders)
		mimeType: text("mime_type").notNull().default(""),
		size: bigint("size", { mode: "number" }).notNull().default(0),
		hash: text("hash"),
		lifecycleState: fileLifecycleStateEnum("lifecycle_state")
			.notNull()
			.default("hot"),
		storageClass: text("storage_class"),
		restoreRequestedAt: timestamp("restore_requested_at", {
			withTimezone: true,
		}),
		restoreExpiresAt: timestamp("restore_expires_at", { withTimezone: true }),
		lifecycleCheckedAt: timestamp("lifecycle_checked_at", {
			withTimezone: true,
		}),
		isEncrypted: boolean("is_encrypted").notNull().default(false),
		encryptedFileKey: text("encrypted_file_key"),
		encryptedChunkSize: integer("encrypted_chunk_size"),
		// Shared state
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
		uniqueIndex("nodes_virtual_path_provider_id_unique").on(
			t.virtualPath,
			t.providerId,
		),
		uniqueIndex("nodes_remote_id_provider_id_unique").on(
			t.remoteId,
			t.providerId,
		),
	],
);

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
