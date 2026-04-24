import { and, eq, isNull } from "drizzle-orm";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import type { Logger } from "@drivebase/logger";
import type { ProviderRegistry } from "@drivebase/storage";
import { instantiateProvider } from "~/services/providers.ts";

const PATH_RE = /^\/api\/download\/([^/]+)\/?$/;

export type DownloadNodeDeps = {
  db: Db;
  config: AppConfig;
  log: Logger;
  registry: ProviderRegistry;
};

export function matchDownloadNodeRoute(
  req: Request,
): { nodeId: string } | null {
  if (req.method !== "GET") return null;
  const url = new URL(req.url);
  const m = PATH_RE.exec(url.pathname);
  if (!m) return null;
  return { nodeId: m[1]! };
}

export async function handleDownloadNode(args: {
  deps: DownloadNodeDeps;
  userId: string;
  nodeId: string;
}): Promise<Response> {
  const { deps, userId, nodeId } = args;

  const [node] = await deps.db
    .select({
      id: schema.nodes.id,
      providerId: schema.nodes.providerId,
      remoteId: schema.nodes.remoteId,
      name: schema.nodes.name,
      type: schema.nodes.type,
      size: schema.nodes.size,
      mimeType: schema.nodes.mimeType,
      remoteUpdatedAt: schema.nodes.remoteUpdatedAt,
    })
    .from(schema.nodes)
    .innerJoin(schema.providers, eq(schema.providers.id, schema.nodes.providerId))
    .where(
      and(
        eq(schema.nodes.id, nodeId),
        eq(schema.providers.userId, userId),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);
  if (!node) return jsonError(404, "node not found");
  if (node.type !== "file") return jsonError(400, "folder downloads are not supported");

  const { instance } = await instantiateProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    userId,
    providerId: node.providerId,
  });

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await instance.download(node.remoteId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.log.error({ err: message, nodeId, providerId: node.providerId }, "download failed");
    return jsonError(502, "failed to download file");
  }

  const headers = new Headers();
  headers.set("content-type", node.mimeType || "application/octet-stream");
  headers.set("content-disposition", buildAttachmentDisposition(node.name));
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  if (node.size != null && Number.isFinite(node.size)) {
    headers.set("content-length", String(node.size));
  }
  if (node.remoteUpdatedAt) {
    headers.set("last-modified", node.remoteUpdatedAt.toUTCString());
  }

  return new Response(stream, {
    status: 200,
    headers,
  });
}

function buildAttachmentDisposition(filename: string): string {
  const fallback = filename
    .replace(/[^\x20-\x7E]+/g, "_")
    .replace(/["\\]/g, "_");
  return `attachment; filename="${fallback || "download"}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
