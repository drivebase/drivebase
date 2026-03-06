import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { workspaces } from "./workspaces";

export const webdavCredentials = pgTable(
	"webdav_credentials",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		username: text("username").notNull(),
		passwordHash: text("password_hash").notNull(),
		providerScopes:
			jsonb("provider_scopes").$type<
				{ providerId: string; basePath: string }[]
			>(),
		isActive: boolean("is_active").notNull().default(true),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("webdav_credentials_workspace_id_idx").on(table.workspaceId),
		uniqueIndex("webdav_credentials_username_unique").on(table.username),
	],
);

export type WebDavCredential = typeof webdavCredentials.$inferSelect;
export type NewWebDavCredential = typeof webdavCredentials.$inferInsert;
