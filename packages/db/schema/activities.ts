import { jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { files } from "./files";
import { folders } from "./folders";
import { storageProviders } from "./providers";
import { users } from "./users";

/**
 * Activity type enum
 */
export const activityTypeEnum = pgEnum("activity_type", [
	"upload",
	"download",
	"create",
	"update",
	"delete",
	"move",
	"copy",
	"share",
	"unshare",
]);

/**
 * Activities table
 */
export const activities = pgTable("activities", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	type: activityTypeEnum("type").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	fileId: text("file_id").references(() => files.id, { onDelete: "set null" }),
	folderId: text("folder_id").references(() => folders.id, {
		onDelete: "set null",
	}),
	providerId: text("provider_id").references(() => storageProviders.id, {
		onDelete: "set null",
	}),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
