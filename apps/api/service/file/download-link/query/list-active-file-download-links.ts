import type { Database } from "@drivebase/db";
import { fileDownloadLinks } from "@drivebase/db";
import { and, asc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { getFile } from "../../query/file-read";
import type { ActiveFileDownloadLinkRow } from "../shared/types";

export async function listActiveFileDownloadLinks(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
): Promise<ActiveFileDownloadLinkRow[]> {
	await getFile(db, fileId, userId, workspaceId);

	return db
		.select({
			id: fileDownloadLinks.id,
			token: fileDownloadLinks.token,
			fileId: fileDownloadLinks.fileId,
			maxDownloads: fileDownloadLinks.maxDownloads,
			downloadCount: fileDownloadLinks.downloadCount,
			expiresAt: fileDownloadLinks.expiresAt,
			lastAccessedAt: fileDownloadLinks.lastAccessedAt,
			createdAt: fileDownloadLinks.createdAt,
			updatedAt: fileDownloadLinks.updatedAt,
		})
		.from(fileDownloadLinks)
		.where(
			and(
				eq(fileDownloadLinks.fileId, fileId),
				eq(fileDownloadLinks.workspaceId, workspaceId),
				isNull(fileDownloadLinks.revokedAt),
				gt(fileDownloadLinks.expiresAt, new Date()),
				or(
					eq(fileDownloadLinks.maxDownloads, 0),
					lt(fileDownloadLinks.downloadCount, fileDownloadLinks.maxDownloads),
				),
			),
		)
		.orderBy(asc(fileDownloadLinks.createdAt));
}
