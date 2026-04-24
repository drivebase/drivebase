import { and, eq } from "drizzle-orm";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import type { Logger } from "@drivebase/logger";
import { writeChunk } from "@drivebase/upload-staging";

/**
 * REST path this handler owns. Matches exactly:
 *     PUT /api/upload/:sessionId/:index
 *
 * It lives outside GraphQL because browsers can't easily PUT raw bytes
 * through a GraphQL request, and because the bytes need to go straight to
 * disk rather than through JSON deserialization.
 *
 * Authentication: the caller must resolve the viewer (via Better Auth) and
 * pass `userId`. The handler scopes every DB op to that id so a forged
 * `:sessionId` from another user returns 404.
 */
const PATH_RE = /^\/api\/upload\/([^/]+)\/(\d+)\/?$/;

export type UploadChunkDeps = {
  db: Db;
  config: AppConfig;
  log: Logger;
};

/**
 * Returns the parsed `{sessionId, index}` if `req` matches the route, else
 * null. Exported so `index.ts` can route cheaply without regex-matching
 * twice.
 */
export function matchUploadChunkRoute(
  req: Request,
): { sessionId: string; index: number } | null {
  if (req.method !== "PUT") return null;
  const url = new URL(req.url);
  const m = PATH_RE.exec(url.pathname);
  if (!m) return null;
  const index = Number(m[2]);
  if (!Number.isInteger(index) || index < 0) return null;
  return { sessionId: m[1]!, index };
}

/**
 * Handle a single chunk upload. The request body is consumed as a
 * `ReadableStream<Uint8Array>` and written to staging. The row in
 * `upload_chunks` is upserted so retries of the same index are idempotent
 * (last writer wins on disk too — the file is re-opened for write).
 *
 * Only proxy-mode sessions accept chunks here; direct-mode sessions PUT
 * straight to the upstream provider via presigned URLs and never touch
 * this endpoint.
 */
export async function handleUploadChunk(args: {
  req: Request;
  deps: UploadChunkDeps;
  userId: string;
  sessionId: string;
  index: number;
}): Promise<Response> {
  const { req, deps, userId, sessionId, index } = args;

  const [session] = await deps.db
    .select()
    .from(schema.uploadSessions)
    .where(
      and(
        eq(schema.uploadSessions.id, sessionId),
        eq(schema.uploadSessions.userId, userId),
      ),
    )
    .limit(1);
  if (!session) return jsonError(404, "upload session not found");
  if (session.mode !== "proxy") {
    return jsonError(400, "session is direct-mode; PUT parts upstream");
  }
  if (
    session.status !== "pending" &&
    session.status !== "uploading"
  ) {
    return jsonError(409, `session status=${session.status}, not accepting chunks`);
  }
  if (index >= session.totalChunks) {
    return jsonError(
      400,
      `index ${index} out of range (totalChunks=${session.totalChunks})`,
    );
  }

  const body = req.body;
  if (!body) return jsonError(400, "empty body");

  let written: { path: string; size: number };
  try {
    written = await writeChunk({
      stagingDir: deps.config.uploads.stagingDir,
      sessionId,
      index,
      stream: body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.log.error({ sessionId, index, err: message }, "chunk write failed");
    return jsonError(500, `failed to persist chunk: ${message}`);
  }

  // Client signaled a length but the body delivered a different amount: fail
  // loud. Happens on truncated uploads where the TCP layer was happy but the
  // client died mid-send.
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    const n = Number(declared);
    if (Number.isFinite(n) && n !== written.size) {
      deps.log.warn(
        { sessionId, index, declared: n, actual: written.size },
        "chunk length mismatch",
      );
      return jsonError(400, "content-length did not match body length");
    }
  }

  // Upsert the chunk row so retries of the same index are accepted. Postgres
  // `ON CONFLICT (sessionId,index) DO UPDATE` keeps the primary key happy.
  await deps.db
    .insert(schema.uploadChunks)
    .values({ sessionId, index, size: written.size })
    .onConflictDoUpdate({
      target: [schema.uploadChunks.sessionId, schema.uploadChunks.index],
      set: { size: written.size, receivedAt: new Date() },
    });

  if (session.status === "pending") {
    await deps.db
      .update(schema.uploadSessions)
      .set({ status: "uploading", updatedAt: new Date() })
      .where(eq(schema.uploadSessions.id, sessionId));
  }

  return Response.json(
    { sessionId, index, size: written.size },
    { status: 200 },
  );
}

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
