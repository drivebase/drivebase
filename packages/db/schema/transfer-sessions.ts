import {
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { jobs } from "./jobs";
import { storageProviders } from "./providers";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const transferSessionStatusEnum = pgEnum("transfer_session_status", [
	"pending",
	"scanning",
	"paused",
	"running",
	"completed",
	"failed",
	"cancelled",
]);

export const transferSessions = pgTable(
	"transfer_sessions",
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
		jobId: text("job_id")
			.notNull()
			.references(() => jobs.id, { onDelete: "cascade" }),
		operation: text("operation").notNull(),
		status: transferSessionStatusEnum("status").notNull().default("pending"),
		targetFolderId: text("target_folder_id"),
		targetProviderId: text("target_provider_id").references(
			() => storageProviders.id,
			{ onDelete: "set null" },
		),
		sourceItems: jsonb("source_items").$type<Record<string, unknown>[]>(),
		manifest: jsonb("manifest").$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [uniqueIndex("transfer_sessions_job_id_unique").on(table.jobId)],
);

export type TransferSession = typeof transferSessions.$inferSelect;
export type NewTransferSession = typeof transferSessions.$inferInsert;
