import type { Database } from "@drivebase/db";
import { webdavCredentials } from "@drivebase/db";
import { eq } from "drizzle-orm";

export async function listWebDavCredentials(db: Database, workspaceId: string) {
	return db
		.select({
			id: webdavCredentials.id,
			workspaceId: webdavCredentials.workspaceId,
			name: webdavCredentials.name,
			username: webdavCredentials.username,
			providerScopes: webdavCredentials.providerScopes,
			isActive: webdavCredentials.isActive,
			lastUsedAt: webdavCredentials.lastUsedAt,
			createdAt: webdavCredentials.createdAt,
			updatedAt: webdavCredentials.updatedAt,
		})
		.from(webdavCredentials)
		.where(eq(webdavCredentials.workspaceId, workspaceId))
		.orderBy(webdavCredentials.createdAt);
}
