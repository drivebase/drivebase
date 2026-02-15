import { files, getDb } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { FileService } from "../../services/file";
import { ProviderService } from "../../services/provider";
import { verifyToken } from "../../utils/jwt";
import { logger } from "../../utils/logger";
import { getProxyCorsHeaders } from "../cors";

/**
 * Handle POST /api/upload/proxy — Proxy file upload to provider
 */
export async function handleUploadProxy(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const fileId = url.searchParams.get("fileId");

	const corsHeaders = getProxyCorsHeaders();

	if (!fileId) {
		return new Response("Missing fileId", {
			status: 400,
			headers: corsHeaders,
		});
	}

	logger.debug({ msg: "Proxy upload started", fileId });

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

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		if (!request.body) {
			return new Response("Missing body", {
				status: 400,
				headers: corsHeaders,
			});
		}

		logger.debug({
			msg: "Streaming upload to provider",
			fileId,
			providerId: file.providerId,
		});
		const newRemoteId = await provider.uploadFile(file.remoteId, request.body);
		await provider.cleanup();

		// If the provider returned a new remote ID (e.g. Telegram message ID),
		// update the file record so subsequent downloads use the correct ID.
		if (newRemoteId && newRemoteId !== file.remoteId) {
			await db
				.update(files)
				.set({ remoteId: newRemoteId, updatedAt: new Date() })
				.where(eq(files.id, fileId));
		}

		logger.debug({ msg: "Proxy upload success", fileId });

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	} catch (error) {
		logger.error({ msg: "Proxy upload failed", error, fileId, userId });

		try {
			if (fileId) {
				const db = getDb();
				await db.delete(files).where(eq(files.id, fileId));
			}
		} catch (cleanupError) {
			logger.error({
				msg: "Failed to cleanup after upload failure",
				error: cleanupError,
				fileId,
			});
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(`Upload failed: ${errorMessage}`, {
			status: 500,
			headers: corsHeaders,
		});
	}
}
