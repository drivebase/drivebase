import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { files } from "./files";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const fileDownloadLinks = pgTable(
	"file_download_links",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		createdBy: text("created_by")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		maxDownloads: integer("max_downloads").notNull().default(1),
		downloadCount: integer("download_count").notNull().default(0),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("file_download_links_file_id_idx").on(table.fileId),
		index("file_download_links_workspace_id_idx").on(table.workspaceId),
	],
);

export type FileDownloadLink = typeof fileDownloadLinks.$inferSelect;
export type NewFileDownloadLink = typeof fileDownloadLinks.$inferInsert;
