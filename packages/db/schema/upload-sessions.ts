import {
	bigint,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { createId } from "../utils";
import { files } from "./files";
import { folders } from "./folders";
import { storageProviders } from "./providers";
import { users } from "./users";

/**
 * Upload session status enum
 */
export const uploadSessionStatusEnum = pgEnum("upload_session_status", [
	"pending",
	"uploading",
	"assembling",
	"transferring",
	"completed",
	"failed",
	"cancelled",
]);

/**
 * Upload sessions table - tracks chunked upload progress
 */
export const uploadSessions = pgTable("upload_sessions", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => createId()),
	fileName: text("file_name").notNull(),
	mimeType: text("mime_type").notNull(),
	totalSize: bigint("total_size", { mode: "number" }).notNull(),
	chunkSize: integer("chunk_size").notNull().default(52428800), // 50MB
	totalChunks: integer("total_chunks").notNull(),
	receivedChunks: integer("received_chunks").notNull().default(0),
	status: uploadSessionStatusEnum("status").notNull().default("pending"),
	errorMessage: text("error_message"),
	providerId: text("provider_id")
		.notNull()
		.references(() => storageProviders.id, { onDelete: "cascade" }),
	folderId: text("folder_id").references(() => folders.id, {
		onDelete: "set null",
	}),
	fileId: text("file_id").references(() => files.id, {
		onDelete: "set null",
	}),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	bullmqJobId: text("bullmq_job_id"),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

/**
 * Upload chunks table - tracks individual chunks received
 */
export const uploadChunks = pgTable(
	"upload_chunks",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		sessionId: text("session_id")
			.notNull()
			.references(() => uploadSessions.id, { onDelete: "cascade" }),
		chunkIndex: integer("chunk_index").notNull(),
		size: bigint("size", { mode: "number" }).notNull(),
		receivedAt: timestamp("received_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		unique("upload_chunks_session_chunk_idx").on(
			table.sessionId,
			table.chunkIndex,
		),
	],
);

export type UploadSession = typeof uploadSessions.$inferSelect;
export type NewUploadSession = typeof uploadSessions.$inferInsert;
export type UploadChunk = typeof uploadChunks.$inferSelect;
export type NewUploadChunk = typeof uploadChunks.$inferInsert;
