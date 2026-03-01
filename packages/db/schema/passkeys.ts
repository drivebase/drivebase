import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";

/**
 * WebAuthn passkey credentials per user
 */
export const passkeys = pgTable("passkeys", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull().default("Passkey"),
	credentialId: text("credential_id").notNull().unique(),
	publicKey: text("public_key").notNull(),
	counter: integer("counter").notNull().default(0),
	deviceType: text("device_type").notNull(),
	backedUp: boolean("backed_up").notNull().default(false),
	transports: text("transports").array(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export type Passkey = typeof passkeys.$inferSelect;
export type NewPasskey = typeof passkeys.$inferInsert;
