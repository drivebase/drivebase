import { pgTable, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { folders } from "./folders";
import { createId } from "../utils";

/**
 * Permission role enum
 */
export const permissionRoleEnum = pgEnum("permission_role", [
	"viewer",
	"editor",
	"admin",
	"owner",
]);

/**
 * Permissions table
 */
export const permissions = pgTable(
	"permissions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		folderId: text("folder_id")
			.notNull()
			.references(() => folders.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: permissionRoleEnum("role").notNull(),
		grantedBy: text("granted_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		// Ensure one permission per user per folder
		uniqueFolderUser: unique().on(table.folderId, table.userId),
	}),
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
