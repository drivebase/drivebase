import {
	bigint,
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { workspaces } from "./workspaces";

/**
 * Provider type enum
 */
export const providerTypeEnum = pgEnum("provider_type", [
	"google_drive",
	"s3",
	"local",
	"dropbox",
	"ftp",
	"webdav",
	"telegram",
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
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
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

/**
 * Reusable OAuth app credentials for provider connections.
 * Stores provider client/app identifiers and secrets separate from connection instances.
 */
export const oauthProviderCredentials = pgTable(
	"oauth_provider_credentials",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		type: providerTypeEnum("type").notNull(),
		encryptedConfig: text("encrypted_config").notNull(),
		identifierLabel: text("identifier_label").notNull(),
		identifierValue: text("identifier_value").notNull(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("oauth_provider_credentials_workspace_type_identifier_idx").on(
			table.workspaceId,
			table.type,
			table.identifierValue,
		),
	],
);

export type StorageProvider = typeof storageProviders.$inferSelect;
export type NewStorageProvider = typeof storageProviders.$inferInsert;
export type OAuthProviderCredential =
	typeof oauthProviderCredentials.$inferSelect;
export type NewOAuthProviderCredential =
	typeof oauthProviderCredentials.$inferInsert;
