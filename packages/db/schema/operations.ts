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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const operationKindEnum = pgEnum("operation_kind", [
  "upload",
  "download",
  "transfer",
  "copy_tree",
  "move_tree",
  "delete_tree",
]);

export const operationStatusEnum = pgEnum("operation_status", [
  "planning",
  "awaiting_user",
  "ready",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const jobKindEnum = pgEnum("job_kind", [
  "create_folder",
  "upload",
  "download",
  "transfer",
  "copy",
  "move",
  "delete",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "skipped",
  "awaiting_conflict",
]);

export const conflictActionEnum = pgEnum("conflict_action", [
  "overwrite",
  "skip",
  "rename",
]);

export const conflictStrategyEnum = pgEnum("conflict_strategy", [
  "overwrite",
  "skip",
  "rename",
  "error",
  "ask",
]);

/** A batch operation — one preflight plan produces one operation row. */
export const operations = pgTable(
  "operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: operationKindEnum("kind").notNull(),
    status: operationStatusEnum("status").notNull().default("planning"),
    strategy: conflictStrategyEnum("strategy").notNull(),
    /** Where the preflight plan, conflicts, and decisions are stored. */
    plan: jsonb("plan").$type<Record<string, unknown>>(),
    summary: jsonb("summary").$type<{
      totalEntries: number;
      totalBytes: number;
      conflicts: number;
    } | null>(),
    error: text("error"),
    /** Set by resolveConflict with applyToAll=true. Workers short-circuit on this. */
    blanketConflictDecision: conflictActionEnum("blanket_conflict_decision"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("operations_user_idx").on(t.userId),
    index("operations_status_idx").on(t.status),
  ],
);

/** One unit of work — one worker picks this up from BullMQ. */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationId: uuid("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    /**
     * When set, this job must not be enqueued to BullMQ until the referenced
     * parent job has succeeded. The createFolder handler enqueues children
     * after it materializes the folder, so transfer/copy jobs never race ahead
     * of the folder creation they depend on.
     */
    parentJobId: uuid("parent_job_id").references((): AnyPgColumn => jobs.id, {
      onDelete: "set null",
    }),
    kind: jobKindEnum("kind").notNull(),
    status: jobStatusEnum("status").notNull().default("queued"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    attemptCount: integer("attempt_count").notNull().default(0),
    bytesTransferred: bigint("bytes_transferred", { mode: "number" })
      .notNull()
      .default(0),
    lastError: text("last_error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("jobs_operation_idx").on(t.operationId),
    index("jobs_status_idx").on(t.status),
    index("jobs_parent_idx").on(t.parentJobId),
  ],
);

/**
 * Runtime conflict records. Created by workers when they detect a file/folder
 * already exists at the destination and the operation strategy is `ask`.
 * The job is suspended (`awaiting_conflict`) until the user resolves it.
 */
export const operationConflicts = pgTable(
  "operation_conflicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operationId: uuid("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    existingType: text("existing_type").notNull(),
    incomingType: text("incoming_type").notNull(),
    decision: conflictActionEnum("decision"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("conflicts_operation_idx").on(t.operationId),
    index("conflicts_job_idx").on(t.jobId),
  ],
);
