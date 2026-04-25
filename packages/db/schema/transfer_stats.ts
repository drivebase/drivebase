import { pgTable, timestamp, bigint, integer, text } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/** Cumulative per-user transfer counters. One row per user, incremented
 * atomically on each succeeded job so reads are O(1). */
export const transferStats = pgTable("transfer_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  bytesUploaded: bigint("bytes_uploaded", { mode: "number" }).notNull().default(0),
  bytesDownloaded: bigint("bytes_downloaded", { mode: "number" }).notNull().default(0),
  bytesTransferred: bigint("bytes_transferred", { mode: "number" }).notNull().default(0),
  filesUploaded: integer("files_uploaded").notNull().default(0),
  filesDownloaded: integer("files_downloaded").notNull().default(0),
  filesTransferred: integer("files_transferred").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
