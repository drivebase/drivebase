import { getDb } from "@drivebase/db";
import { getUploadQueue } from "../../queue/upload-queue";
import { UploadSessionManager } from "../../services/file/upload-session";
import { verifyToken } from "../../utils/jwt";
import { logger } from "../../utils/logger";
import { getProxyCorsHeaders } from "../cors";

/**
 * Handle POST /api/upload/chunk — Receive a file chunk for a chunked upload session
 */
export async function handleUploadChunk(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const sessionId = url.searchParams.get("sessionId");
	const chunkIndexStr = url.searchParams.get("chunkIndex");

	const corsHeaders = getProxyCorsHeaders();

	if (!sessionId || !chunkIndexStr) {
		return new Response(
			JSON.stringify({ error: "Missing sessionId or chunkIndex" }),
			{
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	const chunkIndex = parseInt(chunkIndexStr, 10);
	if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
		return new Response(JSON.stringify({ error: "Invalid chunkIndex" }), {
			status: 400,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}

	// Validate bearer token
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
	} catch {
		return new Response("Invalid token", { status: 401, headers: corsHeaders });
	}

	try {
		const db = getDb();
		const sessionManager = new UploadSessionManager(db);

		// Read chunk data from request body
		const arrayBuffer = await request.arrayBuffer();
		const data = Buffer.from(arrayBuffer);

		const result = await sessionManager.receiveChunk(
			sessionId,
			chunkIndex,
			data,
			userId,
		);

		// If all chunks received, assemble and enqueue BullMQ job
		if (result.isComplete) {
			const assembledPath = await sessionManager.assembleChunks(sessionId);

			const session = await sessionManager.getSession(sessionId);
			if (!session) {
				throw new Error("Session disappeared during assembly");
			}

			const queue = getUploadQueue();
			const job = await queue.add("upload-to-provider", {
				sessionId,
				fileId: session.fileId,
				providerId: session.providerId,
				assembledFilePath: assembledPath,
				fileName: session.fileName,
				mimeType: session.mimeType,
				totalSize: session.totalSize,
			});

			if (job.id) {
				await sessionManager.setBullmqJobId(sessionId, job.id);
			}

			logger.debug({
				msg: "All chunks received, BullMQ job enqueued",
				sessionId,
				jobId: job.id,
			});
		}

		return new Response(
			JSON.stringify({
				success: true,
				chunkIndex: result.chunkIndex,
				isComplete: result.isComplete,
			}),
			{
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error({
			msg: "Chunk upload failed",
			sessionId,
			chunkIndex,
			error: errorMessage,
		});

		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	}
}
