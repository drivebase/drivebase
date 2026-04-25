import { and, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import { meterStream } from "@drivebase/storage";
import type { Handler } from "../runtime/handler.ts";
import {
  resolveDestinationParent,
  upsertMaterializedNode,
} from "../runtime/destination.ts";
import { getProvider } from "../runtime/providers.ts";
import { openAssembledStream, removeSession } from "@drivebase/upload-staging";
import { invalidateEntryCache } from "../runtime/invalidate.ts";
import {
  checkDestinationExists,
  resolveConflictDecision,
} from "../runtime/conflict.ts";

/**
 * Finalize a chunked client upload. Source bytes already live either on
 * our staging disk (proxy mode) or directly at the upstream provider
 * (direct mode, e.g. S3 presigned multipart). In both cases the session
 * must be `ready` — the API's `completeUploadSession` mutation has
 * verified that every chunk/part arrived before the caller flipped
 * `operations.status` to `running` via `executePlan`.
 *
 * Proxy:   stagingDir → openAssembledStream → provider.upload → cleanup
 * Direct:  provider.completeMultipart({uploadId, key, parts}) → cleanup
 *
 * On success the `upload_sessions` row moves to `completed`; on failure it
 * moves to `failed` with `lastError` set so the UI can render the cause.
 * We re-throw so BullMQ can retry according to defaultJobOptions.
 */
export const handleUpload: Handler = async (ctx) => {
  const { deps, operationId, reportProgress, entry, jobId, conflictDecision } = ctx;

  const [session] = await deps.db
    .select()
    .from(schema.uploadSessions)
    .where(
      and(
        eq(schema.uploadSessions.planId, operationId),
        eq(schema.uploadSessions.dstPath, entry.dst.path),
      ),
    )
    .limit(1);
  if (!session) {
    throw new Error(
      `upload job has no upload_session (operationId=${operationId}, dstPath=${entry.dst.path}). ` +
        `executePlan was called without initiateUploadSession + completeUploadSession.`,
    );
  }
  if (session.status !== "ready") {
    throw new Error(
      `upload_session ${session.id} is ${session.status}, expected ready`,
    );
  }

  const provider = await getProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    providerId: session.providerId,
  });

  // Resolve parent before conflict check so we can pass parentRemoteId to the
  // live provider scan. This avoids the stale nodes-table lookup.
  const { parentRemoteId: uploadParentRemoteId, parentId } = await resolveDestinationParent(deps, entry.dst);

  const existing = await checkDestinationExists(provider, uploadParentRemoteId, session.name);
  if (existing) {
    const decision = await resolveConflictDecision({
      deps,
      jobId,
      operationId,
      path: entry.dst.path,
      existingType: existing.type,
      incomingType: "file",
      jobDecision: conflictDecision,
    });
    if (decision === "skip") return { bytes: 0 };
    if (decision === "overwrite") {
      await provider.delete(existing.remoteId);
    }
    // rename: upload proceeds with the original session name; provider creates
    // a new file alongside the existing one (no overwrite).
  }

  try {
    let bytes: number;
    if (session.mode === "proxy") {
      const raw = openAssembledStream({
        stagingDir: deps.config.uploads.stagingDir,
        sessionId: session.id,
        totalChunks: session.totalChunks,
      });
      const metered = meterStream(raw, reportProgress);
      const uploaded = await provider.upload({
        parentRemoteId: session.parentRemoteId,
        name: session.name,
        stream: metered,
        size: session.sizeBytes,
        mimeType: session.mimeType ?? undefined,
      });
      await upsertMaterializedNode({
        deps,
        providerId: entry.dst.providerId,
        parentId,
        pathText: entry.dst.path,
        node: uploaded,
      });
      bytes = uploaded.size ?? session.sizeBytes;
    } else {
      if (!provider.completeMultipart) {
        throw new Error(
          `provider ${provider.type} has no completeMultipart despite session.mode=direct`,
        );
      }
      if (!session.multipartUploadId || !session.multipartKey) {
        throw new Error(
          `direct-mode session ${session.id} missing multipartUploadId/Key`,
        );
      }
      if (!session.parts || session.parts.length !== session.totalChunks) {
        throw new Error(
          `direct-mode session ${session.id} expected ${session.totalChunks} parts, got ${session.parts?.length ?? 0}`,
        );
      }
      const uploaded = await provider.completeMultipart({
        uploadId: session.multipartUploadId,
        key: session.multipartKey,
        parts: session.parts,
      });
      await upsertMaterializedNode({
        deps,
        providerId: entry.dst.providerId,
        parentId,
        pathText: entry.dst.path,
        node: uploaded,
      });
      // Direct uploads never streamed through us; the only byte count we
      // can attribute to this job is the session's declared size.
      reportProgress(session.sizeBytes);
      bytes = session.sizeBytes;
    }

    await deps.db
      .update(schema.uploadSessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.uploadSessions.id, session.id));

    if (session.mode === "proxy") {
      await removeSession({
        stagingDir: deps.config.uploads.stagingDir,
        sessionId: session.id,
      }).catch((err: unknown) => {
        // Staging cleanup failure is non-fatal — a cron sweep will eventually
        // reap the directory. Log so ops can notice if it piles up.
        const message = err instanceof Error ? err.message : String(err);
        deps.log.warn(
          { sessionId: session.id, err: message },
          "staging cleanup failed",
        );
      });
    }

    await invalidateEntryCache(deps, entry);
    void deps.telemetry.track({
      name: 'file.uploaded',
      data: { provider: provider.type, size_kb: Math.round(bytes / 1024) },
    });
    return { bytes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.db
      .update(schema.uploadSessions)
      .set({
        status: "failed",
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(schema.uploadSessions.id, session.id));
    throw err;
  }
};
