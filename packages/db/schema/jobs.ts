import {
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { workspaces } from "./workspaces";

/**
 * Job status enum
 */
export const jobStatusEnum = pgEnum("job_status", [
	"pending",
	"running",
	"completed",
	"error",
]);

/**
 * Jobs table — tracks long-running operations (sync, upload, download, etc.)
 * Separate from the audit-log `activities` table.
 */
export const jobs = pgTable("jobs", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	type: text("type").notNull(),
	title: text("title").notNull(),
	message: text("message"),
	progress: real("progress").notNull().default(0),
	status: jobStatusEnum("status").notNull().default("pending"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
