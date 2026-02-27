import { ConflictError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { logger } from "../../../utils/logger";
import { ProviderService } from "../../provider";
import { getFile, getFileForProxy } from "../query/file-read";

// Stream a regular file through the proxy endpoint.
export async function downloadFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
): Promise<ReadableStream> {
	logger.debug({ msg: "Downloading file stream", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);
		const now = Date.now();
		const restoreExpired =
			file.restoreExpiresAt !== null && file.restoreExpiresAt.getTime() <= now;
		if (
			file.lifecycleState === "archived" ||
			file.lifecycleState === "restore_requested" ||
			file.lifecycleState === "restoring" ||
			(file.lifecycleState === "restored_temporary" && restoreExpired)
		) {
			throw new ConflictError("File is archived and must be restored first", {
				requiresRestore: true,
				state: file.lifecycleState,
				restoreExpiresAt: file.restoreExpiresAt?.toISOString() ?? null,
			});
		}
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);
		return await provider.downloadFile(file.remoteId);
	} catch (error) {
		logger.error({ msg: "Download file stream failed", userId, fileId, error });
		throw error;
	}
}

// Stream a file for proxy flow, including vault-backed files.
export async function downloadFileForProxy(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
): Promise<ReadableStream> {
	logger.debug({ msg: "Downloading file stream (proxy)", userId, fileId });

	try {
		const file = await getFileForProxy(db, fileId, workspaceId);
		const now = Date.now();
		const restoreExpired =
			file.restoreExpiresAt !== null && file.restoreExpiresAt.getTime() <= now;
		if (
			file.lifecycleState === "archived" ||
			file.lifecycleState === "restore_requested" ||
			file.lifecycleState === "restoring" ||
			(file.lifecycleState === "restored_temporary" && restoreExpired)
		) {
			throw new ConflictError("File is archived and must be restored first", {
				requiresRestore: true,
				state: file.lifecycleState,
				restoreExpiresAt: file.restoreExpiresAt?.toISOString() ?? null,
			});
		}
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);
		return await provider.downloadFile(file.remoteId);
	} catch (error) {
		logger.error({
			msg: "Download file stream (proxy) failed",
			userId,
			fileId,
			error,
		});
		throw error;
	}
}
