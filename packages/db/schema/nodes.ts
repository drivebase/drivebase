import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  bigint,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { providers } from "./providers.ts";

export const nodeTypeEnum = pgEnum("node_type", ["file", "folder"]);

/**
 * Unified Node model — any file or folder from any provider.
 *
 * `pathText` is the normalized materialized path ("/foo/bar/baz.txt",
 * lowercased, NFC). Batched conflict detection is a single
 * `WHERE provider_id = $1 AND path_text = ANY($2)` query — this is the
 * hot index.
 */
export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    remoteId: text("remote_id").notNull(),
    name: text("name").notNull(),
    type: nodeTypeEnum("type").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => nodes.id, {
      onDelete: "cascade",
    }),
    pathText: text("path_text").notNull(),
    size: bigint("size", { mode: "number" }),
    mimeType: text("mime_type"),
    checksum: text("checksum"),
    remoteCreatedAt: timestamp("remote_created_at", { withTimezone: true }),
    remoteUpdatedAt: timestamp("remote_updated_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("nodes_provider_remote_uq").on(t.providerId, t.remoteId),
    // Critical index: batched conflict detection.
    index("nodes_provider_path_idx").on(t.providerId, t.pathText),
    index("nodes_provider_parent_idx").on(t.providerId, t.parentId),
  ],
);
