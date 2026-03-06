import type { Database } from "@drivebase/db";
import { users, webdavCredentials } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

export async function getWebDavCredentialByUsername(
	db: Database,
	username: string,
) {
	return db
		.select({
			credentialId: webdavCredentials.id,
			workspaceId: webdavCredentials.workspaceId,
			userId: webdavCredentials.userId,
			email: users.email,
			name: users.name,
			role: users.role,
			userIsActive: users.isActive,
			username: webdavCredentials.username,
			passwordHash: webdavCredentials.passwordHash,
			providerScopes: webdavCredentials.providerScopes,
			isActive: webdavCredentials.isActive,
		})
		.from(webdavCredentials)
		.innerJoin(users, eq(users.id, webdavCredentials.userId))
		.where(
			and(
				eq(webdavCredentials.username, username),
				eq(webdavCredentials.isActive, true),
			),
		)
		.limit(1)
		.then((rows) => rows[0] ?? null);
}
