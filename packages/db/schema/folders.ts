import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { storageProviders } from "./providers";
import { createId } from "../utils";

/**
 * Folders table
 */
export const folders = pgTable("folders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  virtualPath: text("virtual_path").notNull().unique(),
  name: text("name").notNull(),
  remoteId: text("remote_id"),
  providerId: text("provider_id").references(() => storageProviders.id, { onDelete: "set null" }),
  parentId: text("parent_id").references((): any => folders.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isDeleted: boolean("is_deleted").notNull().default(false),
  starred: boolean("starred").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
