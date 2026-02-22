import {
	bigint,
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { folders } from "./folders";
import { storageProviders } from "./providers";
import { users } from "./users";
import { vaults } from "./vaults";

/**
 * Files table
 */
export const files = pgTable(
	"files",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		virtualPath: text("virtual_path").notNull(),
		name: text("name").notNull(),
		mimeType: text("mime_type").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		hash: text("hash"),
		remoteId: text("remote_id").notNull(),
		providerId: text("provider_id")
			.notNull()
			.references(() => storageProviders.id, { onDelete: "cascade" }),
		folderId: text("folder_id").references(() => folders.id, {
			onDelete: "cascade",
		}),
		uploadedBy: text("uploaded_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		vaultId: text("vault_id").references(() => vaults.id, {
			onDelete: "cascade",
		}),
		isEncrypted: boolean("is_encrypted").notNull().default(false),
		encryptedFileKey: text("encrypted_file_key"),
		encryptedChunkSize: integer("encrypted_chunk_size"),
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
		unique("files_virtual_path_provider_id_unique").on(
			t.virtualPath,
			t.providerId,
		),
	],
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
