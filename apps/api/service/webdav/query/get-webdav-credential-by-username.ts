import type { Database } from "@drivebase/db";
import { webdavCredentials } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

export async function getWebDavCredentialByUsername(
	db: Database,
	username: string,
) {
	return db
		.select({
			credentialId: webdavCredentials.id,
			workspaceId: webdavCredentials.workspaceId,
			name: webdavCredentials.name,
			username: webdavCredentials.username,
			passwordHash: webdavCredentials.passwordHash,
			providerScopes: webdavCredentials.providerScopes,
			isActive: webdavCredentials.isActive,
		})
		.from(webdavCredentials)
		.where(
			and(
				eq(webdavCredentials.username, username),
				eq(webdavCredentials.isActive, true),
			),
		)
		.limit(1)
		.then((rows) => rows[0] ?? null);
}
