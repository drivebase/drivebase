import { ConflictError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { getPublicApiBaseUrl } from "../../../config/url";
import { ProviderService } from "../../provider";
import { getFile } from "../query/file-read";
import { logFileOperationDebugError } from "../shared/file-error-log";

// Request a download URL or fallback proxy URL.
export async function requestDownload(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
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
		logFileOperationDebugError({
			operation: "download",
			stage: "request",
			context: { userId, workspaceId, fileId },
			error,
		});
		throw error;
	}
}
