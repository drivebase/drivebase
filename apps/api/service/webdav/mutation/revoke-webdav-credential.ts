import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { webdavCredentials } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

export async function revokeWebDavCredential(
	db: Database,
	workspaceId: string,
	credentialId: string,
) {
	const [credential] = await db
		.update(webdavCredentials)
		.set({
			isActive: false,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(webdavCredentials.id, credentialId),
				eq(webdavCredentials.workspaceId, workspaceId),
			),
		)
		.returning({ id: webdavCredentials.id });

	if (!credential) {
		throw new NotFoundError("WebDAV credential");
	}

	return true;
}
