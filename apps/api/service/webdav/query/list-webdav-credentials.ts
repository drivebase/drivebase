import type { Database } from "@drivebase/db";
import { users, webdavCredentials } from "@drivebase/db";
import { eq } from "drizzle-orm";

export async function listWebDavCredentials(db: Database, workspaceId: string) {
	return db
		.select({
			id: webdavCredentials.id,
			workspaceId: webdavCredentials.workspaceId,
			userId: webdavCredentials.userId,
			userName: users.name,
			userEmail: users.email,
			name: webdavCredentials.name,
			username: webdavCredentials.username,
			providerScopes: webdavCredentials.providerScopes,
			isActive: webdavCredentials.isActive,
			lastUsedAt: webdavCredentials.lastUsedAt,
			createdAt: webdavCredentials.createdAt,
			updatedAt: webdavCredentials.updatedAt,
		})
		.from(webdavCredentials)
		.innerJoin(users, eq(users.id, webdavCredentials.userId))
		.where(eq(webdavCredentials.workspaceId, workspaceId))
		.orderBy(webdavCredentials.createdAt);
}
