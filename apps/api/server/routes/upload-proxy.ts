import { files, getDb } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { FileService } from "../../services/file";
import { ProviderService } from "../../services/provider";
import { logger } from "../../utils/logger";
import type { AppEnv } from "../app";

/**
 * Handle POST /api/upload/proxy — Proxy file upload to provider
 */
export async function handleUploadProxy(c: Context<AppEnv>): Promise<Response> {
	const fileId = c.req.query("fileId");
	const user = c.get("user");

	if (!fileId) {
		return c.json({ error: "Missing fileId" }, 400);
	}

	logger.debug({ msg: "Proxy upload started", fileId });

	try {
		const db = getDb();
		const fileService = new FileService(db);
		const file = await fileService.getFile(fileId, user.userId);

		const providerService = new ProviderService(db);
		const workspaceId = c.req.header("x-workspace-id") ?? undefined;
		const providerRecord = await providerService.getProvider(
			file.providerId,
			user.userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		if (!c.req.raw.body) {
			return c.json({ error: "Missing body" }, 400);
		}

		logger.debug({
			msg: "Streaming upload to provider",
			fileId,
			providerId: file.providerId,
		});
		const newRemoteId = await provider.uploadFile(
			file.remoteId,
			c.req.raw.body,
		);
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

		return c.json({ success: true });
	} catch (error) {
		logger.error({
			msg: "Proxy upload failed",
			error,
			fileId,
			userId: user.userId,
		});

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
		return c.text(`Upload failed: ${errorMessage}`, 500);
	}
}
