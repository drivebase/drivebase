import {
	customType,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { nodes } from "./nodes";
import { workspaces } from "./workspaces";

const tsvector = customType<{ data: string }>({
	dataType() {
		return "tsvector";
	},
});

export const extractionStatusEnum = pgEnum("extraction_status", [
	"pending",
	"processing",
	"completed",
	"failed",
	"unsupported",
]);

/**
 * Stores extracted text content from files for full-text search.
 * Populated by the extraction worker when smart search is enabled.
 */
export const fileContents = pgTable(
	"file_contents",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		nodeId: text("node_id")
			.notNull()
			.references(() => nodes.id, { onDelete: "cascade" })
			.unique(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		extractedText: text("extracted_text"),
		searchVector: tsvector("search_vector"),
		extractionMethod: text("extraction_method"),
		extractionStatus: extractionStatusEnum("extraction_status")
			.notNull()
			.default("pending"),
		errorMessage: text("error_message"),
		language: text("language").default("english"),
		pageCount: integer("page_count"),
		wordCount: integer("word_count"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("file_contents_search_vector_idx").using("gin", t.searchVector),
		index("file_contents_workspace_idx").on(t.workspaceId),
		index("file_contents_status_idx").on(t.extractionStatus),
	],
);

export type FileContent = typeof fileContents.$inferSelect;
export type NewFileContent = typeof fileContents.$inferInsert;
