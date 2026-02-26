import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { fileDownloadLinks } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";

export async function revokeFileDownloadLink(
	db: Database,
	downloadLinkId: string,
	workspaceId: string,
): Promise<boolean> {
	const [downloadLink] = await db
		.update(fileDownloadLinks)
		.set({ revokedAt: new Date(), updatedAt: new Date() })
		.where(
			and(
				eq(fileDownloadLinks.id, downloadLinkId),
				eq(fileDownloadLinks.workspaceId, workspaceId),
				isNull(fileDownloadLinks.revokedAt),
			),
		)
		.returning({ id: fileDownloadLinks.id });

	if (!downloadLink) {
		throw new NotFoundError("File download link");
	}

	return true;
}
