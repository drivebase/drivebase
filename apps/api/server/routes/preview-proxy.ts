import { getDb } from "@drivebase/db";
import type { Context } from "hono";
import { getPreviewCache, setPreviewCache } from "../preview-cache";
import { FileService } from "../../service/file";
import { logger } from "../../utils/logger";
import type { AppEnv } from "../app";

const PREVIEWABLE_PREFIXES = ["image/", "text/"];

function isPreviewable(mimeType: string | null | undefined): boolean {
	if (!mimeType) return false;
	return PREVIEWABLE_PREFIXES.some((p) => mimeType.startsWith(p));
}

/**
 * Handle GET /api/preview — Proxy file content for in-browser preview.
 * Only allows image/* and text/* MIME types.
 * Responses are cached to disk by fileId (prod: DATA_DIR/preview-cache, dev: OS cache dir).
 */
export async function handlePreviewProxy(
	c: Context<AppEnv>,
): Promise<Response> {
	const fileId = c.req.query("fileId");
	const user = c.get("user");

	if (!fileId) {
		return c.text("Missing fileId", 400);
	}

	// --- Cache hit ---
	const cached = await getPreviewCache(fileId);
	if (cached) {
		logger.debug({ msg: "Preview cache hit", fileId });
		return new Response(cached.data.buffer as ArrayBuffer, {
			status: 200,
			headers: {
				"Content-Type": cached.mimeType,
				"Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(cached.name)}`,
				"Cache-Control": "private, max-age=300",
				"X-Preview-Cache": "HIT",
			},
		});
	}

	// --- Cache miss: fetch from provider ---
	try {
		const db = getDb();
		const fileService = new FileService(db);
		const workspaceId = c.req.header("x-workspace-id") ?? undefined;

		const file = await fileService.getFileForProxy(
			fileId,
			user.userId,
			workspaceId,
		);

		if (!isPreviewable(file.mimeType)) {
			return c.text("File type not supported for preview", 415);
		}

		const stream = await fileService.downloadFileForProxy(
			fileId,
			user.userId,
			workspaceId,
		);

		// Buffer the stream so we can both cache and serve it
		const chunks: Uint8Array[] = [];
		const reader = stream.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) chunks.push(value);
		}

		const totalLen = chunks.reduce((n, c) => n + c.byteLength, 0);
		const merged = new Uint8Array(totalLen);
		let offset = 0;
		for (const chunk of chunks) {
			merged.set(chunk, offset);
			offset += chunk.byteLength;
		}
		// Write to cache (fire-and-forget; skipped silently if > 10 MB)
		setPreviewCache(fileId, merged, {
			mimeType: file.mimeType ?? "application/octet-stream",
			name: file.name,
		}).catch(() => {});

		return new Response(merged.buffer as ArrayBuffer, {
			status: 200,
			headers: {
				"Content-Type": file.mimeType || "application/octet-stream",
				"Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
				"Cache-Control": "private, max-age=300",
				"X-Preview-Cache": "MISS",
			},
		});
	} catch (error) {
		logger.error({
			msg: "Preview proxy failed",
			error,
			fileId,
			userId: user.userId,
		});
		const message = error instanceof Error ? error.message : String(error);
		return c.text(`Preview failed: ${message}`, 500);
	}
}
