import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { storageProviders } from "./providers";
import { workspaces } from "./workspaces";

export const workspaceAutoSyncProviders = pgTable(
	"workspace_auto_sync_providers",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		providerId: text("provider_id")
			.notNull()
			.references(() => storageProviders.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("workspace_auto_sync_providers_workspace_provider_uidx").on(
			table.workspaceId,
			table.providerId,
		),
	],
);

export type WorkspaceAutoSyncProvider =
	typeof workspaceAutoSyncProviders.$inferSelect;
export type NewWorkspaceAutoSyncProvider =
	typeof workspaceAutoSyncProviders.$inferInsert;
