import type { Database } from "@drivebase/db";
import { fileDownloadLinks } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { FileDownloadLinkRow } from "../shared/types";

export async function getFileDownloadLinkByToken(
	db: Database,
	token: string,
): Promise<FileDownloadLinkRow | null> {
	const [downloadLink] = await db
		.select({
			id: fileDownloadLinks.id,
			token: fileDownloadLinks.token,
			fileId: fileDownloadLinks.fileId,
			workspaceId: fileDownloadLinks.workspaceId,
			maxDownloads: fileDownloadLinks.maxDownloads,
			downloadCount: fileDownloadLinks.downloadCount,
			expiresAt: fileDownloadLinks.expiresAt,
			lastAccessedAt: fileDownloadLinks.lastAccessedAt,
			revokedAt: fileDownloadLinks.revokedAt,
			createdAt: fileDownloadLinks.createdAt,
			updatedAt: fileDownloadLinks.updatedAt,
		})
		.from(fileDownloadLinks)
		.where(eq(fileDownloadLinks.token, token))
		.limit(1);

	return downloadLink ?? null;
}
