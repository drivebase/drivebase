import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { uploadChunks, uploadSessions } from "@drivebase/db";
import { and, eq, lt, notInArray, sql } from "drizzle-orm";
import { getRedis } from "../../redis/client";
import { logger } from "../../utils/logger";

const UPLOAD_TEMP_DIR = "/tmp/drivebase-uploads";
const SESSION_TTL_SECONDS = 86400; // 24 hours
const DEFAULT_CHUNK_SIZE = 52428800; // 50MB

export interface UploadSessionRedisState {
	sessionId: string;
	status: string;
	phase: string;
	totalChunks: number;
	receivedChunks: number;
	totalSize: number;
	providerBytesTransferred: number;
	errorMessage: string | null;
}

export interface CreateSessionInput {
	fileName: string;
	mimeType: string;
	totalSize: number;
	chunkSize?: number;
	providerId: string;
	folderId?: string;
	userId: string;
	fileId: string;
}

export interface ReceiveChunkResult {
	isComplete: boolean;
	chunkIndex: number;
}

/**
 * Upload Session Manager
 * Manages chunked upload session lifecycle with Redis state for real-time reads
 * and PostgreSQL for durability.
 */
export class UploadSessionManager {
	constructor(private db: Database) {}

	/**
	 * Create a new upload session
	 */
	async createSession(input: CreateSessionInput): Promise<{
		sessionId: string;
		totalChunks: number;
		chunkSize: number;
	}> {
		const chunkSize = input.chunkSize ?? DEFAULT_CHUNK_SIZE;
		const totalChunks = Math.ceil(input.totalSize / chunkSize);

		if (totalChunks < 1) {
			throw new ValidationError("File too small for chunked upload");
		}

		const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

		// Create temp directory
		const sessionId = crypto.randomUUID().replace(/-/g, "");
		const sessionDir = `${UPLOAD_TEMP_DIR}/${sessionId}`;
		await Bun.write(`${sessionDir}/.keep`, "");

		// Insert DB record
		const [session] = await this.db
			.insert(uploadSessions)
			.values({
				id: sessionId,
				fileName: input.fileName,
				mimeType: input.mimeType,
				totalSize: input.totalSize,
				chunkSize,
				totalChunks,
				receivedChunks: 0,
				status: "pending",
				providerId: input.providerId,
				folderId: input.folderId ?? null,
				fileId: input.fileId,
				userId: input.userId,
				expiresAt,
			})
			.returning();

		if (!session) {
			throw new Error("Failed to create upload session");
		}

		// Set Redis state for real-time reads
		const redisState: UploadSessionRedisState = {
			sessionId,
			status: "pending",
			phase: "client_to_server",
			totalChunks,
			receivedChunks: 0,
			totalSize: input.totalSize,
			providerBytesTransferred: 0,
			errorMessage: null,
		};

		const redis = getRedis();
		await redis.set(
			`upload:session:${sessionId}`,
			JSON.stringify(redisState),
			"EX",
			SESSION_TTL_SECONDS,
		);

		logger.debug({
			msg: "Upload session created",
			sessionId,
			totalChunks,
			chunkSize,
			totalSize: input.totalSize,
		});

		return { sessionId, totalChunks, chunkSize };
	}

	/**
	 * Receive a chunk for an upload session
	 */
	async receiveChunk(
		sessionId: string,
		chunkIndex: number,
		data: Buffer,
		userId: string,
	): Promise<ReceiveChunkResult> {
		// Validate session exists and belongs to user
		const [session] = await this.db
			.select()
			.from(uploadSessions)
			.where(
				and(
					eq(uploadSessions.id, sessionId),
					eq(uploadSessions.userId, userId),
				),
			)
			.limit(1);

		if (!session) {
			throw new ValidationError("Upload session not found");
		}

		if (session.status === "cancelled" || session.status === "failed") {
			throw new ValidationError(`Upload session is ${session.status}`);
		}

		if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
			throw new ValidationError(
				`Invalid chunk index ${chunkIndex}. Expected 0-${session.totalChunks - 1}`,
			);
		}

		// Check if chunk already received (idempotency)
		const [existingChunk] = await this.db
			.select()
			.from(uploadChunks)
			.where(
				and(
					eq(uploadChunks.sessionId, sessionId),
					eq(uploadChunks.chunkIndex, chunkIndex),
				),
			)
			.limit(1);

		if (existingChunk) {
			// Already received, return current state
			const isComplete = session.receivedChunks >= session.totalChunks;
			return { isComplete, chunkIndex };
		}

		// Write chunk to disk
		const chunkPath = `${UPLOAD_TEMP_DIR}/${sessionId}/chunk-${chunkIndex}`;
		await Bun.write(chunkPath, data);

		// Insert chunk record
		await this.db.insert(uploadChunks).values({
			sessionId,
			chunkIndex,
			size: data.length,
		});

		// Increment received_chunks in DB
		await this.db
			.update(uploadSessions)
			.set({
				receivedChunks: sql`${uploadSessions.receivedChunks} + 1`,
				status: "uploading",
				updatedAt: new Date(),
			})
			.where(eq(uploadSessions.id, sessionId));

		// Update Redis state
		const redis = getRedis();
		const redisKey = `upload:session:${sessionId}`;
		const stateJson = await redis.get(redisKey);
		if (stateJson) {
			const state = JSON.parse(stateJson) as UploadSessionRedisState;
			state.receivedChunks += 1;
			state.status = "uploading";
			await redis.set(
				redisKey,
				JSON.stringify(state),
				"EX",
				SESSION_TTL_SECONDS,
			);
		}

		const newReceivedChunks = session.receivedChunks + 1;
		const isComplete = newReceivedChunks >= session.totalChunks;

		logger.debug({
			msg: "Chunk received",
			sessionId,
			chunkIndex,
			receivedChunks: newReceivedChunks,
			totalChunks: session.totalChunks,
			isComplete,
		});

		return { isComplete, chunkIndex };
	}

	/**
	 * Assemble all chunks into a single file
	 */
	async assembleChunks(sessionId: string): Promise<string> {
		const sessionDir = `${UPLOAD_TEMP_DIR}/${sessionId}`;
		const assembledPath = `${sessionDir}/assembled`;

		// Update status
		await this.updateStatus(sessionId, "assembling");

		// Get session to know total chunks
		const [session] = await this.db
			.select()
			.from(uploadSessions)
			.where(eq(uploadSessions.id, sessionId))
			.limit(1);

		if (!session) {
			throw new Error("Session not found during assembly");
		}

		// Use Bun.file and write to concatenate chunks in order
		const writer = Bun.file(assembledPath).writer();

		for (let i = 0; i < session.totalChunks; i++) {
			const chunkPath = `${sessionDir}/chunk-${i}`;
			const chunkFile = Bun.file(chunkPath);
			const chunkData = await chunkFile.arrayBuffer();
			writer.write(new Uint8Array(chunkData));
		}

		await writer.end();

		logger.debug({
			msg: "Chunks assembled",
			sessionId,
			assembledPath,
			totalChunks: session.totalChunks,
		});

		return assembledPath;
	}

	/**
	 * Update provider transfer progress (called by BullMQ worker)
	 */
	async updateProviderProgress(
		sessionId: string,
		bytesTransferred: number,
		status?: string,
	): Promise<void> {
		const redis = getRedis();
		const redisKey = `upload:session:${sessionId}`;
		const stateJson = await redis.get(redisKey);

		if (stateJson) {
			const state = JSON.parse(stateJson) as UploadSessionRedisState;
			state.providerBytesTransferred = bytesTransferred;
			state.phase = "server_to_provider";
			if (status) {
				state.status = status;
			}
			await redis.set(
				redisKey,
				JSON.stringify(state),
				"EX",
				SESSION_TTL_SECONDS,
			);
		}

		if (status) {
			await this.db
				.update(uploadSessions)
				.set({
					status: status as typeof uploadSessions.$inferSelect.status,
					updatedAt: new Date(),
				})
				.where(eq(uploadSessions.id, sessionId));
		}
	}

	/**
	 * Cancel an upload session
	 */
	async cancelSession(sessionId: string, userId: string): Promise<void> {
		const [session] = await this.db
			.select()
			.from(uploadSessions)
			.where(
				and(
					eq(uploadSessions.id, sessionId),
					eq(uploadSessions.userId, userId),
				),
			)
			.limit(1);

		if (!session) {
			throw new ValidationError("Upload session not found");
		}

		await this.updateStatus(sessionId, "cancelled");

		// Clean up temp files
		await this.cleanupSessionFiles(sessionId);

		logger.debug({ msg: "Upload session cancelled", sessionId });
	}

	/**
	 * Get all active (non-terminal) sessions for a user
	 */
	async getActiveSessionsForUser(userId: string) {
		const terminalStatuses = ["completed", "failed", "cancelled"] as const;

		const sessions = await this.db
			.select()
			.from(uploadSessions)
			.where(
				and(
					eq(uploadSessions.userId, userId),
					notInArray(uploadSessions.status, [...terminalStatuses]),
				),
			);

		// Enrich with Redis state for real-time data
		const redis = getRedis();
		const enriched = await Promise.all(
			sessions.map(async (session) => {
				const stateJson = await redis.get(`upload:session:${session.id}`);
				const redisState = stateJson
					? (JSON.parse(stateJson) as UploadSessionRedisState)
					: null;

				return {
					sessionId: session.id,
					fileName: session.fileName,
					totalSize: session.totalSize,
					status: redisState?.status ?? session.status,
					phase: redisState?.phase ?? "client_to_server",
					receivedChunks: redisState?.receivedChunks ?? session.receivedChunks,
					totalChunks: session.totalChunks,
					providerBytesTransferred: redisState?.providerBytesTransferred ?? 0,
					errorMessage: redisState?.errorMessage ?? session.errorMessage,
					createdAt: session.createdAt.toISOString(),
				};
			}),
		);

		return enriched;
	}

	/**
	 * Get Redis state for a session (used by subscription resolver)
	 */
	async getSessionState(
		sessionId: string,
	): Promise<UploadSessionRedisState | null> {
		const redis = getRedis();
		const stateJson = await redis.get(`upload:session:${sessionId}`);
		if (!stateJson) return null;
		return JSON.parse(stateJson) as UploadSessionRedisState;
	}

	/**
	 * Get a session by ID
	 */
	async getSession(sessionId: string) {
		const [session] = await this.db
			.select()
			.from(uploadSessions)
			.where(eq(uploadSessions.id, sessionId))
			.limit(1);

		return session ?? null;
	}

	/**
	 * Set BullMQ job ID on a session
	 */
	async setBullmqJobId(sessionId: string, jobId: string): Promise<void> {
		await this.db
			.update(uploadSessions)
			.set({ bullmqJobId: jobId, updatedAt: new Date() })
			.where(eq(uploadSessions.id, sessionId));
	}

	/**
	 * Clean up expired sessions and their temp files
	 */
	async cleanupExpiredSessions(): Promise<number> {
		const expired = await this.db
			.select({ id: uploadSessions.id })
			.from(uploadSessions)
			.where(lt(uploadSessions.expiresAt, new Date()));

		for (const session of expired) {
			await this.cleanupSessionFiles(session.id);

			// Remove Redis state
			const redis = getRedis();
			await redis.del(`upload:session:${session.id}`);
		}

		if (expired.length > 0) {
			const ids = expired.map((s) => s.id);
			// Chunks cascade-delete with sessions
			await this.db.delete(uploadSessions).where(
				sql`${uploadSessions.id} IN (${sql.join(
					ids.map((id) => sql`${id}`),
					sql`, `,
				)})`,
			);

			logger.info({
				msg: "Cleaned up expired upload sessions",
				count: expired.length,
			});
		}

		return expired.length;
	}

	/**
	 * Update session status in both DB and Redis
	 */
	private async updateStatus(
		sessionId: string,
		status: string,
		errorMessage?: string,
	): Promise<void> {
		await this.db
			.update(uploadSessions)
			.set({
				status: status as typeof uploadSessions.$inferSelect.status,
				errorMessage: errorMessage ?? null,
				updatedAt: new Date(),
			})
			.where(eq(uploadSessions.id, sessionId));

		const redis = getRedis();
		const redisKey = `upload:session:${sessionId}`;
		const stateJson = await redis.get(redisKey);
		if (stateJson) {
			const state = JSON.parse(stateJson) as UploadSessionRedisState;
			state.status = status;
			if (errorMessage !== undefined) {
				state.errorMessage = errorMessage;
			}
			await redis.set(
				redisKey,
				JSON.stringify(state),
				"EX",
				SESSION_TTL_SECONDS,
			);
		}
	}

	/**
	 * Remove temp files for a session
	 */
	private async cleanupSessionFiles(sessionId: string): Promise<void> {
		const sessionDir = `${UPLOAD_TEMP_DIR}/${sessionId}`;
		try {
			const proc = Bun.spawn(["rm", "-rf", sessionDir]);
			await proc.exited;
		} catch {
			// Ignore cleanup errors
		}
	}

	/**
	 * Mark session as failed
	 */
	async markFailed(sessionId: string, errorMessage: string): Promise<void> {
		await this.updateStatus(sessionId, "failed", errorMessage);
	}

	/**
	 * Mark session as completed
	 */
	async markCompleted(sessionId: string): Promise<void> {
		await this.updateStatus(sessionId, "completed");
		await this.cleanupSessionFiles(sessionId);
	}
}
