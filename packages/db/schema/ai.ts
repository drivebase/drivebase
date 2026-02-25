import {
	boolean,
	customType,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { files } from "./files";
import { workspaces } from "./workspaces";

const vector = (name: string, dimensions: number) =>
	customType<{ data: number[]; driverData: string }>({
		dataType() {
			return `vector(${dimensions})`;
		},
		toDriver(value: number[]): string {
			return `[${value.join(",")}]`;
		},
	})(name);

export const analysisTaskTypeEnum = pgEnum("analysis_task_type", [
	"embedding",
	"ocr",
	"object_detection",
]);

export const analysisStatusEnum = pgEnum("analysis_status", [
	"pending",
	"running",
	"completed",
	"failed",
	"skipped",
]);

export const analysisModelTierEnum = pgEnum("analysis_model_tier", [
	"lightweight",
	"medium",
	"heavy",
]);

export const analysisTriggerEnum = pgEnum("analysis_trigger", [
	"upload",
	"manual_reprocess",
	"backfill",
	"provider_sync",
]);

export const fileAnalysisRuns = pgTable(
	"file_analysis_runs",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		analysisKey: text("analysis_key").notNull(),
		trigger: analysisTriggerEnum("trigger").notNull().default("upload"),
		status: analysisStatusEnum("status").notNull().default("pending"),
		embeddingStatus: analysisStatusEnum("embedding_status")
			.notNull()
			.default("pending"),
		ocrStatus: analysisStatusEnum("ocr_status").notNull().default("pending"),
		objectDetectionStatus: analysisStatusEnum("object_detection_status")
			.notNull()
			.default("pending"),
		embeddingError: text("embedding_error"),
		ocrError: text("ocr_error"),
		objectDetectionError: text("object_detection_error"),
		tierEmbedding: analysisModelTierEnum("tier_embedding")
			.notNull()
			.default("medium"),
		tierOcr: analysisModelTierEnum("tier_ocr").notNull().default("medium"),
		tierObject: analysisModelTierEnum("tier_object")
			.notNull()
			.default("medium"),
		attemptCount: integer("attempt_count").notNull().default(0),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("file_analysis_runs_analysis_key_idx").on(table.analysisKey),
	],
);

export const fileEmbeddings = pgTable(
	"file_embeddings",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		runId: text("run_id")
			.notNull()
			.references(() => fileAnalysisRuns.id, { onDelete: "cascade" }),
		modelName: text("model_name").notNull(),
		modelTier: analysisModelTierEnum("model_tier").notNull(),
		embedding: vector("embedding", 512),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("file_embeddings_file_model_run_idx").on(
			table.fileId,
			table.modelName,
			table.runId,
		),
	],
);

export const fileExtractedText = pgTable("file_extracted_text", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	fileId: text("file_id")
		.notNull()
		.references(() => files.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	runId: text("run_id")
		.notNull()
		.references(() => fileAnalysisRuns.id, { onDelete: "cascade" }),
	source: text("source").notNull(),
	language: text("language"),
	text: text("text").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const fileDetectedObjects = pgTable("file_detected_objects", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	fileId: text("file_id")
		.notNull()
		.references(() => files.id, { onDelete: "cascade" }),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	runId: text("run_id")
		.notNull()
		.references(() => fileAnalysisRuns.id, { onDelete: "cascade" }),
	label: text("label").notNull(),
	confidence: real("confidence").notNull(),
	bbox: jsonb("bbox").$type<{
		x: number;
		y: number;
		width: number;
		height: number;
	}>(),
	count: integer("count").notNull().default(1),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const fileTextChunks = pgTable(
	"file_text_chunks",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		fileId: text("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		runId: text("run_id")
			.notNull()
			.references(() => fileAnalysisRuns.id, { onDelete: "cascade" }),
		source: text("source").notNull(),
		chunkIndex: integer("chunk_index").notNull(),
		text: text("text").notNull(),
		modelName: text("model_name").notNull(),
		modelTier: analysisModelTierEnum("model_tier").notNull(),
		embedding: vector("embedding", 512).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("file_text_chunks_file_run_chunk_idx").on(
			table.fileId,
			table.runId,
			table.chunkIndex,
		),
		index("file_text_chunks_workspace_idx").on(table.workspaceId),
		index("file_text_chunks_file_idx").on(table.fileId),
	],
);

export const workspaceAiSettings = pgTable("workspace_ai_settings", {
	workspaceId: text("workspace_id")
		.primaryKey()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	enabled: boolean("enabled").notNull().default(false),
	modelsReady: boolean("models_ready").notNull().default(false),
	embeddingTier: analysisModelTierEnum("embedding_tier")
		.notNull()
		.default("medium"),
	ocrTier: analysisModelTierEnum("ocr_tier").notNull().default("medium"),
	objectTier: analysisModelTierEnum("object_tier").notNull().default("medium"),
	maxConcurrency: integer("max_concurrency").notNull().default(2),
	config: jsonb("config")
		.$type<Record<string, unknown>>()
		.notNull()
		.default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const workspaceAiProgress = pgTable("workspace_ai_progress", {
	workspaceId: text("workspace_id")
		.primaryKey()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	eligibleFiles: integer("eligible_files").notNull().default(0),
	processedFiles: integer("processed_files").notNull().default(0),
	pendingFiles: integer("pending_files").notNull().default(0),
	runningFiles: integer("running_files").notNull().default(0),
	failedFiles: integer("failed_files").notNull().default(0),
	skippedFiles: integer("skipped_files").notNull().default(0),
	completedFiles: integer("completed_files").notNull().default(0),
	completionPct: real("completion_pct").notNull().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type FileAnalysisRun = typeof fileAnalysisRuns.$inferSelect;
export type NewFileAnalysisRun = typeof fileAnalysisRuns.$inferInsert;
export type FileEmbedding = typeof fileEmbeddings.$inferSelect;
export type NewFileEmbedding = typeof fileEmbeddings.$inferInsert;
export type FileExtractedText = typeof fileExtractedText.$inferSelect;
export type NewFileExtractedText = typeof fileExtractedText.$inferInsert;
export type FileDetectedObject = typeof fileDetectedObjects.$inferSelect;
export type NewFileDetectedObject = typeof fileDetectedObjects.$inferInsert;
export type FileTextChunk = typeof fileTextChunks.$inferSelect;
export type NewFileTextChunk = typeof fileTextChunks.$inferInsert;
export type WorkspaceAiSetting = typeof workspaceAiSettings.$inferSelect;
export type NewWorkspaceAiSetting = typeof workspaceAiSettings.$inferInsert;
export type WorkspaceAiProgress = typeof workspaceAiProgress.$inferSelect;
export type NewWorkspaceAiProgress = typeof workspaceAiProgress.$inferInsert;
