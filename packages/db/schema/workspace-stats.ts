import {
	bigint,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { workspaces } from "./workspaces";

export const workspaceStats = pgTable(
	"workspace_stats",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
		uploadedBytes: bigint("uploaded_bytes", { mode: "number" })
			.notNull()
			.default(0),
		downloadedBytes: bigint("downloaded_bytes", { mode: "number" })
			.notNull()
			.default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("workspace_stats_workspace_bucket_unique").on(
			table.workspaceId,
			table.bucketStart,
		),
	],
);

export type WorkspaceStats = typeof workspaceStats.$inferSelect;
export type NewWorkspaceStats = typeof workspaceStats.$inferInsert;
