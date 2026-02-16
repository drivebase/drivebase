import { getDb } from "@drivebase/db";
import type { Context } from "hono";
import { FileService } from "../../services/file";
import { logger } from "../../utils/logger";
import type { AppEnv } from "../app";

/**
 * Handle GET /api/download/proxy — Proxy file download from provider
 */
export async function handleDownloadProxy(
	c: Context<AppEnv>,
): Promise<Response> {
	const fileId = c.req.query("fileId");
	const user = c.get("user");

	if (!fileId) {
		return c.text("Missing fileId", 400);
	}

	logger.debug({ msg: "Proxy download started", fileId });

	try {
		const db = getDb();
		const fileService = new FileService(db);
		const file = await fileService.getFile(fileId, user.userId);

		logger.debug({
			msg: "Streaming download from provider",
			fileId,
			providerId: file.providerId,
		});
		const stream = await fileService.downloadFile(fileId, user.userId);

		const encodedName = encodeURIComponent(file.name);
		return new Response(stream, {
			status: 200,
			headers: {
				"Content-Type": file.mimeType || "application/octet-stream",
				"Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
			},
		});
	} catch (error) {
		logger.error({
			msg: "Proxy download failed",
			error,
			fileId,
			userId: user.userId,
		});
		const errorMessage = error instanceof Error ? error.message : String(error);
		return c.text(`Download failed: ${errorMessage}`, 500);
	}
}
