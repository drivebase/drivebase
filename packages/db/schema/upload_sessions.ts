import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  bigint,
  integer,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { providers } from "./providers.ts";

/**
 * Two upload strategies, picked at `initiateUploadSession` based on the
 * destination provider's capabilities:
 *   - `proxy`  — client PUTs chunks to our REST endpoint, worker assembles
 *                them into a single stream and calls provider.upload().
 *                Used for any provider without presigned multipart support
 *                (Google Drive, Dropbox).
 *   - `direct` — client PUTs parts directly to the upstream provider via
 *                short-TTL presigned URLs (S3-compatible). Our process
 *                never sees the bytes. Worker just calls completeMultipart.
 */
export const uploadSessionModeEnum = pgEnum("upload_session_mode", [
  "proxy",
  "direct",
]);

/**
 * Lifecycle:
 *   pending     — row created, no chunks/parts received yet.
 *   uploading   — at least one chunk/part recorded.
 *   ready       — every chunk/part accounted for; `completeUploadSession`
 *                 has been called. Worker can finalize now.
 *   completed   — worker wrote the Node row and finalized the Operation.
 *   failed      — terminal; see last_error.
 *   cancelled   — user called `cancelUploadSession`; staging has been
 *                 cleaned up (proxy) or AbortMultipartUpload fired (direct).
 */
export const uploadSessionStatusEnum = pgEnum("upload_session_status", [
  "pending",
  "uploading",
  "ready",
  "completed",
  "failed",
  "cancelled",
]);

/**
 * One upload session = one file's worth of bytes on its way from the
 * client to a provider. Always tied back to an `operations` plan and the
 * destination path of one `upload` plan entry under that operation.
 *
 * Bytes are either in our staging dir (proxy mode) or already on the
 * upstream provider under a multipart upload id (direct mode). The row
 * holds exactly enough state for the worker to finalize without any
 * client involvement.
 */
export const uploadSessions = pgTable(
  "upload_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    /** Provider remoteId of the destination parent folder. NULL = provider root. */
    parentRemoteId: text("parent_remote_id"),
    /** Destination filename, post-conflict-resolution (may differ from client-supplied). */
    name: text("name").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    mimeType: text("mime_type"),
    mode: uploadSessionModeEnum("mode").notNull(),
    chunkSizeBytes: integer("chunk_size_bytes").notNull(),
    totalChunks: integer("total_chunks").notNull(),
    status: uploadSessionStatusEnum("status").notNull().default("pending"),
    /** Proxy mode: staging path relative to config.uploads.stagingDir. */
    stagingDir: text("staging_dir"),
    /** Direct mode: the upstream multipart upload id. */
    multipartUploadId: text("multipart_upload_id"),
    /** Direct mode: the destination key at the upstream provider. */
    multipartKey: text("multipart_key"),
    /**
     * Direct mode, populated at `completeUploadSession`:
     * `[{ partNumber, etag }, ...]`. Worker replays this into
     * provider.completeMultipart. Proxy mode leaves it null.
     */
    parts: jsonb("parts").$type<Array<{ partNumber: number; etag: string }> | null>(),
    /** Operation/plan produced by preflight. */
    planId: uuid("plan_id"),
    /** Destination path of the upload entry this session belongs to. */
    dstPath: text("dst_path").notNull(),
    lastError: text("last_error"),
    /** Cleanup cron sweeps sessions past this timestamp if still pending/uploading/ready. */
    abandonedAfter: timestamp("abandoned_after", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("upload_sessions_user_idx").on(t.userId),
    index("upload_sessions_status_idx").on(t.status),
    // Sweep target for the cleanup cron.
    index("upload_sessions_abandoned_idx").on(t.abandonedAfter),
    index("upload_sessions_plan_idx").on(t.planId),
    index("upload_sessions_plan_path_idx").on(t.planId, t.dstPath),
  ],
);

/**
 * Per-chunk receipt row (proxy mode only). Worker needs nothing from
 * this table beyond "are all N present?" — the actual bytes live on disk
 * under `stagingDir/<index>.bin`. Tracked in DB so we can detect
 * half-written / crashed uploads on process restart.
 *
 * Direct-mode part ETags are stored in `uploadSessions.parts` JSONB
 * because they arrive as a single batch from the client at
 * completeUploadSession time.
 */
export const uploadChunks = pgTable(
  "upload_chunks",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => uploadSessions.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    size: integer("size").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.index] })],
);
