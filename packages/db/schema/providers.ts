import {
	bigint,
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";

/**
 * Provider type enum
 */
export const providerTypeEnum = pgEnum("provider_type", [
	"google_drive",
	"s3",
	"local",
]);

/**
 * Authentication type enum
 */
export const authTypeEnum = pgEnum("auth_type", [
	"oauth",
	"api_key",
	"email_pass",
	"no_auth",
]);

/**
 * Storage providers table
 */
export const storageProviders = pgTable("storage_providers", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	type: providerTypeEnum("type").notNull(),
	authType: authTypeEnum("auth_type").notNull().default("no_auth"),
	encryptedConfig: text("encrypted_config").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	isActive: boolean("is_active").notNull().default(true),
	accountEmail: text("account_email"),
	accountName: text("account_name"),
	rootFolderId: text("root_folder_id"),
	quotaTotal: bigint("quota_total", { mode: "number" }),
	quotaUsed: bigint("quota_used", { mode: "number" }).notNull().default(0),
	lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type StorageProvider = typeof storageProviders.$inferSelect;
export type NewStorageProvider = typeof storageProviders.$inferInsert;
