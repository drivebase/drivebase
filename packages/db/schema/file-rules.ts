import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { folders } from "./folders";
import { storageProviders } from "./providers";
import { users } from "./users";
import { workspaces } from "./workspaces";

/**
 * Condition types for file placement rules
 */
export type RuleConditionField = "mimeType" | "extension" | "size" | "name";

export type RuleConditionOperator =
	| "equals"
	| "notEquals"
	| "contains"
	| "startsWith"
	| "endsWith"
	| "in"
	| "greaterThan"
	| "lessThan"
	| "greaterThanOrEqual"
	| "lessThanOrEqual";

export interface RuleCondition {
	field: RuleConditionField;
	operator: RuleConditionOperator;
	value: string | number | string[];
}

/** All conditions in a group are AND-ed */
export interface RuleConditionGroup {
	conditions: RuleCondition[];
}

/** Groups are OR-ed together */
export interface RuleConditionGroups {
	groups: RuleConditionGroup[];
}

/**
 * File placement rules table
 */
export const fileRules = pgTable("file_rules", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text("name").notNull(),
	priority: integer("priority").notNull(),
	enabled: boolean("enabled").notNull().default(true),
	conditions: jsonb("conditions").notNull().$type<RuleConditionGroups>(),
	destinationProviderId: text("destination_provider_id")
		.notNull()
		.references(() => storageProviders.id, { onDelete: "cascade" }),
	destinationFolderId: text("destination_folder_id").references(
		() => folders.id,
		{ onDelete: "set null" },
	),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	isDeleted: boolean("is_deleted").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type FileRule = typeof fileRules.$inferSelect;
export type NewFileRule = typeof fileRules.$inferInsert;
