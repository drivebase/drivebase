import { and, eq, isNull } from "drizzle-orm";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import type { Logger } from "@drivebase/logger";
import { getQueue } from "~/services/orchestrator/enqueue.ts";
import { readPreview } from "~/services/preview-cache.ts";

const PATH_RE = /^\/api\/preview\/([^/]+)\/?$/;

export type PreviewNodeDeps = {
  db: Db;
  config: AppConfig;
  log: Logger;
};

export type PreviewJobData = {
  nodeId: string;
  userId: string;
  remoteId: string;
  providerId: string;
  mimeType: string | null;
};

export function matchPreviewRoute(req: Request): { nodeId: string } | null {
  if (req.method !== "GET") return null;
  const url = new URL(req.url);
  const m = PATH_RE.exec(url.pathname);
  if (!m) return null;
  return { nodeId: m[1]! };
}

export async function handlePreviewNode(args: {
  deps: PreviewNodeDeps;
  userId: string;
  nodeId: string;
}): Promise<Response> {
  const { deps, userId, nodeId } = args;

  const cached = await readPreview(deps.config, nodeId);
  if (cached) {
    deps.log.debug({ nodeId }, "preview: cache hit");
    return new Response(cached, {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(cached.byteLength),
        "cache-control": "private, max-age=604800",
      },
    });
  }

  deps.log.info({ nodeId, userId }, "preview: cache miss, querying node");

  const [node] = await deps.db
    .select({
      id: schema.nodes.id,
      name: schema.nodes.name,
      remoteId: schema.nodes.remoteId,
      providerId: schema.nodes.providerId,
      mimeType: schema.nodes.mimeType,
      type: schema.nodes.type,
    })
    .from(schema.nodes)
    .innerJoin(
      schema.providers,
      eq(schema.providers.id, schema.nodes.providerId),
    )
    .where(
      and(
        eq(schema.nodes.id, nodeId),
        eq(schema.providers.userId, userId),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);

  if (!node) {
    deps.log.warn({ nodeId, userId }, "preview: node not found");
    return jsonError(404, "node not found");
  }
  if (node.type !== "file") {
    deps.log.warn({ nodeId }, "preview: node is a folder");
    return jsonError(400, "folders have no preview");
  }
  if (!isPreviewable(node.name, node.mimeType)) {
    deps.log.warn({ nodeId, name: node.name, mimeType: node.mimeType }, "preview: not previewable");
    return jsonError(422, "not an image");
  }

  const q = await getQueue("previewGenerate");
  const jobData: PreviewJobData = {
    nodeId,
    userId,
    remoteId: node.remoteId,
    providerId: node.providerId,
    mimeType: node.mimeType ?? null,
  };
  const job = await q.add("previewGenerate", jobData, {
    jobId: `preview-${nodeId}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
  deps.log.info({ nodeId, jobId: job?.id ?? "dedup-skipped" }, "preview: enqueued");

  return Response.json({ status: "pending" }, { status: 202 });
}

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "heic", "avif", "tiff", "bmp"]);

function isPreviewable(name: string, mimeType: string | null | undefined): boolean {
  if (mimeType?.startsWith("image/")) return true;
  const ext = name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return ext ? IMAGE_EXTS.has(ext) : false;
}

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
