import { and, eq, inArray } from "drizzle-orm";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import type {
  IStorageProvider,
  PlanEntry,
  ProviderRegistry,
} from "@drivebase/storage";
import { GraphQLError } from "graphql";
import { badInput, notFound } from "~/graphql/errors.ts";
import { instantiateProvider } from "~/services/providers.ts";
import { planFromRow } from "~/graphql/modules/operations/helpers.ts";
import { removeSession } from "@drivebase/upload-staging";

export type UploadSessionRow = typeof schema.uploadSessions.$inferSelect;
type NonEmptyArray<T> = [T, ...T[]];

export type InitiateResult = {
  sessions: NonEmptyArray<InitiatedUploadSession>;
  session: UploadSessionRow;
  chunkUploadUrlPattern: string | null;
  presignedParts: Array<{ partNumber: number; url: string }> | null;
};

export type InitiatedUploadSession = {
  session: UploadSessionRow;
  /** Proxy mode: the REST path template the client substitutes `{index}` into. */
  chunkUploadUrlPattern: string | null;
  /** Direct mode: an ordered list of presigned PUT URLs, one per part. */
  presignedParts: Array<{ partNumber: number; url: string }> | null;
};

type Deps = {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
};

/**
 * Promote a READY upload operation into one byte-plumbing `upload_sessions`
 * row per upload entry. Mode is picked from the destination provider's
 * capabilities:
 *   - `supportsPresignedUploadParts` → direct  (browser PUTs straight at S3)
 *   - otherwise                      → proxy   (client PUTs to our REST)
 *
 * Direct-mode initiates the upstream multipart for each file and mints
 * presigned part URLs up front; the server never sees chunk bytes.
 * Proxy-mode creates one session per file whose staging directory the
 * client will PUT chunks into.
 */
export async function initiateUploadSession(args: {
  deps: Deps;
  userId: string;
  operationId: string;
  chunkSizeBytesOverride?: number;
}): Promise<InitiateResult> {
  const { deps, userId, operationId, chunkSizeBytesOverride } = args;

  const [op] = await deps.db
    .select()
    .from(schema.operations)
    .where(
      and(
        eq(schema.operations.id, operationId),
        eq(schema.operations.userId, userId),
      ),
    )
    .limit(1);
  if (!op) throw notFound("operation");
  if (op.kind !== "upload") {
    throw badInput("operation is not an upload");
  }
  if (op.status !== "ready") {
    throw badInput(`operation status is ${op.status}, must be ready`);
  }

  const plan = planFromRow(op.plan);
  if (!plan) throw new Error("operation missing plan");

  const uploadEntries = plan.entries.filter(
    (e): e is UploadEntry => e.kind === "upload",
  );
  if (uploadEntries.length === 0) {
    throw badInput("upload operation has no upload entries");
  }
  if (plan.input.kind !== "upload") {
    throw new Error("plan.input.kind mismatch");
  }
  const providerId = plan.input.dstProviderId;

  const existing = await deps.db
    .select({ id: schema.uploadSessions.id })
    .from(schema.uploadSessions)
    .where(eq(schema.uploadSessions.planId, operationId))
    .limit(1);
  if (existing.length > 0) {
    throw badInput("upload session already initiated for this operation");
  }

  const { instance } = await instantiateProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    userId,
    providerId,
  });

  const chunkSize =
    chunkSizeBytesOverride ?? deps.config.uploads.defaultChunkSizeBytes;
  if (chunkSize <= 0) throw badInput("chunkSizeBytes must be positive");

  const useDirect =
    instance.capabilities.supportsPresignedUploadParts &&
    typeof instance.initiateMultipart === "function" &&
    typeof instance.generatePresignedPartUrls === "function";

  const abandonedAfter = new Date(
    Date.now() + deps.config.uploads.sessionTtlSeconds * 1000,
  );

  const sessions: InitiatedUploadSession[] = [];
  for (const entry of uploadEntries) {
    const size = entry.size ?? 0;
    if (size <= 0) {
      throw badInput(`upload entry ${entry.dst.path} has no size; cannot chunk`);
    }
    const totalChunks = Math.max(1, Math.ceil(size / chunkSize));
    if (useDirect) {
      sessions.push(
        await initiateDirect({
          deps,
          userId,
          operationId,
          providerId,
          entry,
          instance,
          size,
          chunkSize,
          totalChunks,
          abandonedAfter,
        }),
      );
      continue;
    }
    sessions.push(
      await initiateProxy({
        deps,
        userId,
        operationId,
        providerId,
        entry,
        size,
        chunkSize,
        totalChunks,
        abandonedAfter,
      }),
    );
  }

  const [first, ...rest] = sessions;
  if (!first) throw new Error("initiateUploadSession produced no sessions");
  return {
    sessions: [first, ...rest],
    session: first.session,
    chunkUploadUrlPattern: first.chunkUploadUrlPattern,
    presignedParts: first.presignedParts,
  };
}

async function initiateProxy(args: {
  deps: Deps;
  userId: string;
  operationId: string;
  providerId: string;
  entry: UploadEntry;
  size: number;
  chunkSize: number;
  totalChunks: number;
  abandonedAfter: Date;
}): Promise<InitiatedUploadSession> {
  const { deps, userId, operationId, providerId, entry, size, chunkSize, totalChunks, abandonedAfter } = args;
  const [row] = await deps.db
    .insert(schema.uploadSessions)
    .values({
      userId,
      providerId,
      parentRemoteId: entry.dst.parentRemoteId ?? null,
      name: entry.dst.name,
      sizeBytes: size,
      mode: "proxy",
      chunkSizeBytes: chunkSize,
      totalChunks,
      planId: operationId,
      dstPath: entry.dst.path,
      abandonedAfter,
    })
    .returning();
  if (!row) throw new Error("failed to insert upload session");

  return {
    session: row,
    chunkUploadUrlPattern: `/api/upload/${row.id}/{index}`,
    presignedParts: null,
  };
}

async function initiateDirect(args: {
  deps: Deps;
  userId: string;
  operationId: string;
  providerId: string;
  entry: UploadEntry;
  instance: IStorageProvider;
  size: number;
  chunkSize: number;
  totalChunks: number;
  abandonedAfter: Date;
}): Promise<InitiatedUploadSession> {
  const { deps, userId, operationId, providerId, entry, instance, size, chunkSize, totalChunks, abandonedAfter } = args;

  if (!instance.initiateMultipart || !instance.generatePresignedPartUrls) {
    throw new Error("provider claims direct-mode but lacks multipart methods");
  }

  const { uploadId, key } = await instance.initiateMultipart({
    parentRemoteId: entry.dst.parentRemoteId ?? null,
    name: entry.dst.name,
    size,
  });

  const partNumbers = Array.from({ length: totalChunks }, (_, i) => i + 1);
  const presignedParts = await instance.generatePresignedPartUrls({
    uploadId,
    key,
    partNumbers,
  });

  const [row] = await deps.db
    .insert(schema.uploadSessions)
    .values({
      userId,
      providerId,
      parentRemoteId: entry.dst.parentRemoteId ?? null,
      name: entry.dst.name,
      sizeBytes: size,
      mode: "direct",
      chunkSizeBytes: chunkSize,
      totalChunks,
      multipartUploadId: uploadId,
      multipartKey: key,
      planId: operationId,
      dstPath: entry.dst.path,
      abandonedAfter,
    })
    .returning();
  if (!row) throw new Error("failed to insert upload session");

  return {
    session: row,
    chunkUploadUrlPattern: null,
    presignedParts,
  };
}

type UploadEntry = PlanEntry;

/**
 * Client signals "I'm done shipping bytes". Proxy mode verifies every chunk
 * has arrived on disk; direct mode stores the etags the browser collected.
 * Flips the session from `uploading` to `ready` so the worker (triggered by
 * executePlan) can finalize.
 */
export async function completeUploadSession(args: {
  deps: Deps;
  userId: string;
  sessionId: string;
  parts?: Array<{ partNumber: number; etag: string }>;
}): Promise<UploadSessionRow> {
  const { deps, userId, sessionId, parts } = args;

  const session = await loadOwnedSession(deps.db, userId, sessionId);
  if (session.status !== "pending" && session.status !== "uploading") {
    throw badInput(
      `session status is ${session.status}, cannot complete`,
    );
  }

  if (session.mode === "direct") {
    if (!parts || parts.length !== session.totalChunks) {
      throw badInput(
        `direct upload requires ${session.totalChunks} parts, got ${parts?.length ?? 0}`,
      );
    }
    const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
    // Expect contiguous 1..N part numbers; anything else means the client lied.
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i]!.partNumber !== i + 1) {
        throw badInput(
          `parts must be numbered 1..${session.totalChunks} contiguously`,
        );
      }
      if (!sorted[i]!.etag) throw badInput(`part ${i + 1} missing etag`);
    }
    const [updated] = await deps.db
      .update(schema.uploadSessions)
      .set({ parts: sorted, status: "ready", updatedAt: new Date() })
      .where(eq(schema.uploadSessions.id, sessionId))
      .returning();
    if (!updated) throw new Error("failed to update session");
    return updated;
  }

  // Proxy mode — every chunk must be present in upload_chunks.
  const received = await deps.db
    .select({ index: schema.uploadChunks.index })
    .from(schema.uploadChunks)
    .where(eq(schema.uploadChunks.sessionId, sessionId));
  const got = new Set(received.map((r) => r.index));
  const missing: number[] = [];
  for (let i = 0; i < session.totalChunks; i += 1) {
    if (!got.has(i)) missing.push(i);
  }
  if (missing.length > 0) {
    throw badInput(
      `missing ${missing.length} of ${session.totalChunks} chunks`,
      { missing: missing.slice(0, 10) },
    );
  }

  const [updated] = await deps.db
    .update(schema.uploadSessions)
    .set({ status: "ready", updatedAt: new Date() })
    .where(eq(schema.uploadSessions.id, sessionId))
    .returning();
  if (!updated) throw new Error("failed to update session");
  return updated;
}

/**
 * Tear down an in-flight session. Direct mode fires `abortMultipart` so S3
 * stops charging for parked parts; proxy mode removes the staging dir from
 * disk. Idempotent — calling on a terminal session returns it unchanged.
 */
export async function cancelUploadSession(args: {
  deps: Deps;
  userId: string;
  sessionId: string;
}): Promise<UploadSessionRow> {
  const { deps, userId, sessionId } = args;
  const session = await loadOwnedSession(deps.db, userId, sessionId);
  if (
    session.status === "completed" ||
    session.status === "failed" ||
    session.status === "cancelled"
  ) {
    return session;
  }

  if (
    session.mode === "direct" &&
    session.multipartUploadId &&
    session.multipartKey
  ) {
    try {
      const { instance } = await instantiateProvider({
        db: deps.db,
        config: deps.config,
        registry: deps.registry,
        userId,
        providerId: session.providerId,
      });
      if (instance.abortMultipart) {
        await instance.abortMultipart({
          uploadId: session.multipartUploadId,
          key: session.multipartKey,
        });
      }
    } catch (err) {
      // Best-effort abort; we still want the row to go to cancelled so the
      // client is unblocked. The abandonedAfter sweeper can retry later.
      const message = err instanceof Error ? err.message : String(err);
      await deps.db
        .update(schema.uploadSessions)
        .set({ lastError: `abortMultipart: ${message}` })
        .where(eq(schema.uploadSessions.id, sessionId));
    }
  }

  if (session.mode === "proxy") {
    await removeSession({
      stagingDir: deps.config.uploads.stagingDir,
      sessionId,
    }).catch(() => {});
  }

  const [updated] = await deps.db
    .update(schema.uploadSessions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(schema.uploadSessions.id, sessionId))
    .returning();
  if (!updated) throw new Error("failed to update session");
  return updated;
}

async function loadOwnedSession(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<UploadSessionRow> {
  const [row] = await db
    .select()
    .from(schema.uploadSessions)
    .where(
      and(
        eq(schema.uploadSessions.id, sessionId),
        eq(schema.uploadSessions.userId, userId),
      ),
    )
    .limit(1);
  if (!row) throw notFound("upload session");
  return row;
}

/**
 * List all non-terminal sessions for the viewer. Terminal sessions
 * (completed/failed/cancelled) are excluded because the UI uses this to
 * render in-flight work, not history.
 */
export async function listActiveUploadSessions(args: {
  db: Db;
  userId: string;
}): Promise<UploadSessionRow[]> {
  return args.db
    .select()
    .from(schema.uploadSessions)
    .where(
      and(
        eq(schema.uploadSessions.userId, args.userId),
        inArray(schema.uploadSessions.status, ["pending", "uploading", "ready"]),
      ),
    );
}

export async function getUploadSession(args: {
  db: Db;
  userId: string;
  id: string;
}): Promise<UploadSessionRow | null> {
  const [row] = await args.db
    .select()
    .from(schema.uploadSessions)
    .where(
      and(
        eq(schema.uploadSessions.id, args.id),
        eq(schema.uploadSessions.userId, args.userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Guard against GraphQL callers forgetting the try/catch on cancel. */
export function isNotFound(err: unknown): boolean {
  return (
    err instanceof GraphQLError &&
    (err.extensions as { code?: string } | undefined)?.code === "NOT_FOUND"
  );
}
