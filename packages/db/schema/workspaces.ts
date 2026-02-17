import {
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";

/**
 * Workspace role enum
 */
export const workspaceRoleEnum = pgEnum("workspace_role", [
	"owner",
	"admin",
	"editor",
	"viewer",
]);

/**
 * Workspaces table
 */
export const workspaces = pgTable("workspaces", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

/**
 * Workspace members table
 */
export const workspaceMembers = pgTable(
	"workspace_members",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: workspaceRoleEnum("role").notNull().default("viewer"),
		joinedAt: timestamp("joined_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("workspace_members_workspace_user_idx").on(
			table.workspaceId,
			table.userId,
		),
	],
);

/**
 * Workspace invite links table
 */
export const workspaceInvites = pgTable("workspace_invites", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	role: workspaceRoleEnum("role").notNull().default("viewer"),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	maxUses: integer("max_uses"),
	useCount: integer("use_count").notNull().default(0),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvites.$inferInsert;
