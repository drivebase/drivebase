import type { Database } from "@drivebase/db";
import { files } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { telemetry } from "../../../telemetry";
import { logger } from "../../../utils/logger";
import { ActivityService } from "../../activity";
import { ProviderService } from "../../provider";
import { getFile } from "../query/file-read";

// Delete a file from provider and remove local record.
export async function deleteFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Deleting file", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);
		await provider.delete({ remoteId: file.remoteId, isFolder: false });
		await provider.cleanup();

		await db
			.delete(files)
			.where(and(eq(files.id, fileId), eq(files.nodeType, "file")));
		telemetry.capture("file_deleted");

		await new ActivityService(db).log({
			kind: "file.deleted",
			title: "File deleted",
			summary: file.name,
			status: "success",
			userId,
			workspaceId,
			details: {
				fileId,
				providerId: file.providerId,
				folderId: file.folderId ?? undefined,
				name: file.name,
				virtualPath: file.virtualPath,
			},
		});
	} catch (error) {
		logger.error({ msg: "Delete file failed", userId, fileId, error });
		throw error;
	}
}
