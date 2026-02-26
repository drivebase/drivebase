import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { fileDownloadLinks } from "@drivebase/db";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { getFileDownloadLinkByToken } from "../query/get-file-download-link-by-token";
import type { FileDownloadLinkContext } from "../shared/types";

export async function consumeFileDownloadLink(
	db: Database,
	token: string,
): Promise<FileDownloadLinkContext> {
	const now = new Date();

	const [consumed] = await db
		.update(fileDownloadLinks)
		.set({
			downloadCount: sql`${fileDownloadLinks.downloadCount} + 1`,
			lastAccessedAt: now,
			updatedAt: now,
		})
		.where(
			and(
				eq(fileDownloadLinks.token, token),
				isNull(fileDownloadLinks.revokedAt),
				gt(fileDownloadLinks.expiresAt, now),
				or(
					eq(fileDownloadLinks.maxDownloads, 0),
					lt(fileDownloadLinks.downloadCount, fileDownloadLinks.maxDownloads),
				),
			),
		)
		.returning({
			downloadLinkId: fileDownloadLinks.id,
			token: fileDownloadLinks.token,
			fileId: fileDownloadLinks.fileId,
			workspaceId: fileDownloadLinks.workspaceId,
			maxDownloads: fileDownloadLinks.maxDownloads,
			downloadCount: fileDownloadLinks.downloadCount,
			expiresAt: fileDownloadLinks.expiresAt,
			lastAccessedAt: fileDownloadLinks.lastAccessedAt,
		});

	if (consumed) {
		return consumed;
	}

	const downloadLink = await getFileDownloadLinkByToken(db, token);
	if (!downloadLink) {
		throw new NotFoundError("File download link");
	}

	if (downloadLink.revokedAt) {
		throw new ValidationError("Download link has been revoked");
	}

	if (downloadLink.expiresAt.getTime() <= now.getTime()) {
		throw new ValidationError("Download link has expired");
	}

	if (
		downloadLink.maxDownloads !== 0 &&
		downloadLink.downloadCount >= downloadLink.maxDownloads
	) {
		throw new ValidationError("Download link limit reached");
	}

	throw new ValidationError("Download link is not available");
}
