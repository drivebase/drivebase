import type { Database } from "@drivebase/db";
import { fileDownloadLinks } from "@drivebase/db";
import { getFile } from "../../query/file-read";
import type { ActiveFileDownloadLinkRow } from "../shared/types";
import {
	validateFileDownloadLinkExpiry,
	validateFileDownloadLinkMaxDownloads,
} from "../shared/validation";

export async function createFileDownloadLink(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
	maxDownloads: number,
	expiresAt: Date,
): Promise<ActiveFileDownloadLinkRow> {
	validateFileDownloadLinkMaxDownloads(maxDownloads);
	validateFileDownloadLinkExpiry(expiresAt);

	await getFile(db, fileId, userId, workspaceId);

	const token = `fdl_${crypto.randomUUID().replaceAll("-", "")}`;

	const [downloadLink] = await db
		.insert(fileDownloadLinks)
		.values({
			workspaceId,
			fileId,
			createdBy: userId,
			token,
			maxDownloads,
			expiresAt,
		})
		.returning({
			id: fileDownloadLinks.id,
			token: fileDownloadLinks.token,
			fileId: fileDownloadLinks.fileId,
			maxDownloads: fileDownloadLinks.maxDownloads,
			downloadCount: fileDownloadLinks.downloadCount,
			expiresAt: fileDownloadLinks.expiresAt,
			lastAccessedAt: fileDownloadLinks.lastAccessedAt,
			createdAt: fileDownloadLinks.createdAt,
			updatedAt: fileDownloadLinks.updatedAt,
		});

	if (!downloadLink) {
		throw new Error("Failed to create file download link");
	}

	return downloadLink;
}
