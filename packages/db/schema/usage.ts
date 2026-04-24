import {
  pgTable,
  timestamp,
  uuid,
  bigint,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { providers } from "./providers.ts";

/**
 * Per-provider storage usage. Columns are nullable because not every
 * provider surfaces every value (S3 exposes `used`, not `total`).
 */
export const usage = pgTable(
  "usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    total: bigint("total", { mode: "number" }),
    used: bigint("used", { mode: "number" }),
    available: bigint("available", { mode: "number" }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("usage_provider_uq").on(t.providerId)],
);
