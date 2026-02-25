import { getDb } from "@drivebase/db";
import type { Context } from "hono";
import { pubSub } from "../../graphql/pubsub";
import { getUploadQueue } from "../../queue/upload-queue";
import { UploadSessionManager } from "../../services/file/upload";
import { logger } from "../../utils/logger";
import type { AppEnv } from "../app";

/**
 * Handle POST /api/upload/chunk — Receive a file chunk for a chunked upload session
 */
export async function handleUploadChunk(c: Context<AppEnv>): Promise<Response> {
	const sessionId = c.req.query("sessionId");
	const chunkIndexStr = c.req.query("chunkIndex");
	const user = c.get("user");

	if (!sessionId || !chunkIndexStr) {
		return c.json({ error: "Missing sessionId or chunkIndex" }, 400);
	}

	const chunkIndex = parseInt(chunkIndexStr, 10);
	if (Number.isNaN(chunkIndex) || chunkIndex < 0) {
		return c.json({ error: "Invalid chunkIndex" }, 400);
	}

	try {
		const db = getDb();
		const sessionManager = new UploadSessionManager(db);

		// Read chunk data from request body
		const arrayBuffer = await c.req.raw.arrayBuffer();
		const data = Buffer.from(arrayBuffer);

		const result = await sessionManager.receiveChunk(
			sessionId,
			chunkIndex,
			data,
			user.userId,
		);

		const state = await sessionManager.getSessionState(sessionId);
		if (state) {
			pubSub.publish("uploadProgress", sessionId, {
				sessionId,
				status: state.status,
				phase: state.phase,
				receivedChunks: state.receivedChunks,
				totalChunks: state.totalChunks,
				providerBytesTransferred: state.providerBytesTransferred,
				totalSize: state.totalSize,
				errorMessage: state.errorMessage,
			});
		}

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

		return c.json({
			success: true,
			chunkIndex: result.chunkIndex,
			isComplete: result.isComplete,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error({
			msg: "Chunk upload failed",
			sessionId,
			chunkIndex,
			error: errorMessage,
		});

		return c.json({ error: errorMessage }, 500);
	}
}
