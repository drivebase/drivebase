import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { oauthApps } from "./oauth_apps.ts";

export const providerAuthKindEnum = pgEnum("provider_auth_kind", [
  "oauth",
  "api_key",
  "credentials",
  "none",
]);

export const providerStatusEnum = pgEnum("provider_status", [
  "connected",
  "error",
  "disconnected",
]);

/**
 * A connected storage provider instance owned by a user.
 * `credentials` holds the AES-256-GCM ciphertext blob (structured as
 * { iv, tag, ct } base64) for whichever auth shape the provider expects.
 */
export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    authKind: providerAuthKindEnum("auth_kind").notNull(),
    /** Set when authKind='oauth' — points at the user's OAuth app registration. */
    oauthAppId: uuid("oauth_app_id").references(() => oauthApps.id, {
      onDelete: "restrict",
    }),
    label: text("label").notNull(),
    status: providerStatusEnum("status").notNull().default("connected"),
    /** Encrypted credentials blob — never read outside ProviderRegistry. */
    credentials: jsonb("credentials").$type<{
      iv: string;
      tag: string;
      ct: string;
    } | null>(),
    /** Provider-specific non-secret state: OAuth cursors, bucket name, root id, etc. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("providers_user_idx").on(t.userId),
    uniqueIndex("providers_user_label_uq").on(t.userId, t.label),
  ],
);
