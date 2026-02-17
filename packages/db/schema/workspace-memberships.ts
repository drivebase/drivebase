import { pgEnum, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const workspaceRoleEnum = pgEnum("workspace_role", [
	"owner",
	"admin",
	"editor",
	"viewer",
]);

export const workspaceMemberships = pgTable(
	"workspace_memberships",
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
		invitedBy: text("invited_by").references(() => users.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		uniqueWorkspaceUser: unique().on(table.workspaceId, table.userId),
	}),
);

export const workspaceInvites = pgTable("workspace_invites", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	role: workspaceRoleEnum("role").notNull().default("viewer"),
	invitedBy: text("invited_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	acceptedBy: text("accepted_by").references(() => users.id, {
		onDelete: "set null",
	}),
	acceptedAt: timestamp("accepted_at", { withTimezone: true }),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect;
export type NewWorkspaceMembership = typeof workspaceMemberships.$inferInsert;

export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvites.$inferInsert;
