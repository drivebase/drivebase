import { getDb } from "@drivebase/db";
import { FileService } from "../../services/file";
import { verifyToken } from "../../utils/jwt";
import { logger } from "../../utils/logger";
import { getProxyCorsHeaders } from "../cors";

/**
 * Handle GET /api/download/proxy — Proxy file download from provider
 */
export async function handleDownloadProxy(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const fileId = url.searchParams.get("fileId");
	const corsHeaders = getProxyCorsHeaders();

	if (!fileId) {
		return new Response("Missing fileId", {
			status: 400,
			headers: corsHeaders,
		});
	}

	logger.debug({ msg: "Proxy download started", fileId });

	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}

	const token = authHeader.split(" ")[1];
	if (!token) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}

	let userId: string;
	try {
		const payload = await verifyToken(token);
		userId = payload.userId;
	} catch (_error) {
		return new Response("Invalid token", { status: 401, headers: corsHeaders });
	}

	try {
		const db = getDb();
		const fileService = new FileService(db);
		const file = await fileService.getFile(fileId, userId);

		logger.debug({
			msg: "Streaming download from provider",
			fileId,
			providerId: file.providerId,
		});
		const stream = await fileService.downloadFile(fileId, userId);

		const encodedName = encodeURIComponent(file.name);
		return new Response(stream, {
			status: 200,
			headers: {
				...corsHeaders,
				"Content-Type": file.mimeType || "application/octet-stream",
				"Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
			},
		});
	} catch (error) {
		logger.error({ msg: "Proxy download failed", error, fileId, userId });
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(`Download failed: ${errorMessage}`, {
			status: 500,
			headers: corsHeaders,
		});
	}
}
