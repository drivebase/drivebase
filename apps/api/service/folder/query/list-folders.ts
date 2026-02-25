import type { Database } from "@drivebase/db";
import { folders } from "@drivebase/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

// List folders at root or under a parent with optional provider filtering.
export async function listFolders(
	db: Database,
	_userId: string,
	workspaceId: string,
	parentId?: string,
	providerIds?: string[],
) {
	const conditions = [
		eq(folders.nodeType, "folder"),
		eq(folders.isDeleted, false),
		eq(folders.workspaceId, workspaceId),
		isNull(folders.vaultId),
	];

	if (parentId) {
		conditions.push(eq(folders.parentId, parentId));
	} else {
		conditions.push(isNull(folders.parentId));
	}

	if (providerIds && providerIds.length > 0) {
		conditions.push(inArray(folders.providerId, providerIds));
	}

	return db
		.select()
		.from(folders)
		.where(and(...conditions))
		.orderBy(folders.name);
}
