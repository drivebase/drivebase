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
