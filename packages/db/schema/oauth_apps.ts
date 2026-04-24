import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

/**
 * A user-registered OAuth app (Google Cloud project, Dropbox app, etc.).
 * Users create these once, then reference them by id when connecting a
 * provider that uses `oauth` auth kind.
 *
 * `clientSecret` is an AES-256-GCM ciphertext blob; never read outside
 * `ProviderRegistry`. The redirect URI and required scopes are derived
 * from `auth.baseUrl` + the provider module's declared scope set — they
 * are not stored per-app.
 */
export const oauthApps = pgTable(
  "oauth_apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Provider type this app is for, e.g. "google_drive", "dropbox". */
    provider: text("provider").notNull(),
    label: text("label").notNull(),
    clientId: text("client_id").notNull(),
    clientSecret: jsonb("client_secret")
      .$type<{ iv: string; tag: string; ct: string }>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("oauth_apps_user_idx").on(t.userId),
    uniqueIndex("oauth_apps_user_label_uq").on(t.userId, t.label),
  ],
);
