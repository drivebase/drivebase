import type { Database } from "@drivebase/db";
import { getPublicApiBaseUrl } from "../../../config/url";
import { logger } from "../../../utils/logger";
import { ProviderService } from "../../provider";
import { getFile } from "../query/file-read";

// Request a download URL or fallback proxy URL.
export async function requestDownload(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Requesting download", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);
		const downloadResponse = await provider.requestDownload({
			remoteId: file.remoteId,
		});
		await provider.cleanup();

		const proxyUrl = `${getPublicApiBaseUrl()}/api/download/proxy?fileId=${file.id}`;
		const useDirectDownload =
			downloadResponse.useDirectDownload &&
			Boolean(downloadResponse.downloadUrl);

		return {
			file,
			downloadUrl: useDirectDownload
				? (downloadResponse.downloadUrl ?? undefined)
				: proxyUrl,
			useDirectDownload,
		};
	} catch (error) {
		logger.error({ msg: "Request download failed", userId, fileId, error });
		throw error;
	}
}
