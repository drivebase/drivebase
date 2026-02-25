import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Activities table
 */
export const activities = pgTable(
	"activities",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		kind: text("kind").notNull(),
		title: text("title").notNull(),
		summary: text("summary"),
		status: text("status"),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		workspaceId: text("workspace_id").references(() => workspaces.id, {
			onDelete: "set null",
		}),
		details: jsonb("details").$type<Record<string, unknown>>(),
		occurredAt: timestamp("occurred_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("activities_workspace_created_idx").on(
			table.workspaceId,
			table.createdAt,
		),
		index("activities_workspace_type_created_idx").on(
			table.workspaceId,
			table.kind,
			table.occurredAt,
		),
	],
);

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
