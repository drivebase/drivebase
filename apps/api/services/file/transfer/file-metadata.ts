import type { Database } from "@drivebase/db";
import { logger } from "../../../utils/logger";
import { ProviderService } from "../../provider";
import { getFile } from "../query/file-read";

// Fetch provider metadata and merge it with local file data.
export async function getFileMetadata(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Getting file metadata", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);
		const metadata = await provider.getFileMetadata(file.remoteId);
		await provider.cleanup();
		return { ...file, providerMetadata: metadata };
	} catch (error) {
		logger.error({ msg: "Get file metadata failed", userId, fileId, error });
		throw error;
	}
}
