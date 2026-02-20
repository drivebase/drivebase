import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { users } from "./users";

/**
 * Vaults table
 *
 * One vault per user. All files inside are E2EE encrypted client-side.
 * The server stores only encrypted key material — it never sees plaintext.
 */
export const vaults = pgTable("vaults", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	publicKey: text("public_key").notNull(),
	encryptedPrivateKey: text("encrypted_private_key").notNull(),
	kekSalt: text("kek_salt").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Vault = typeof vaults.$inferSelect;
export type NewVault = typeof vaults.$inferInsert;
