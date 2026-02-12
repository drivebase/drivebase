import { pgTable, text, timestamp, boolean, bigint } from "drizzle-orm/pg-core";
import { users } from "./users";
import { storageProviders } from "./providers";
import { folders } from "./folders";
import { createId } from "../utils";

/**
 * Files table
 */
export const files = pgTable("files", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	virtualPath: text("virtual_path").notNull().unique(),
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
	isDeleted: boolean("is_deleted").notNull().default(false),
	starred: boolean("starred").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
