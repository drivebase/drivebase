import { files, folders, getDb } from "@drivebase/db";
import { and, eq, like } from "drizzle-orm";

export async function markFolderSubtreeDeleted(
	workspaceId: string,
	providerId: string,
	rootVirtualPath: string,
) {
	const db = getDb();
	const prefix = `${rootVirtualPath}/%`;
	await db
		.update(files)
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(
			and(
				eq(files.workspaceId, workspaceId),
				eq(files.providerId, providerId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				like(files.virtualPath, prefix),
			),
		);

	await db
		.update(folders)
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(
			and(
				eq(folders.workspaceId, workspaceId),
				eq(folders.providerId, providerId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				like(folders.virtualPath, `${rootVirtualPath}/%`),
			),
		);

	await db
		.update(folders)
		.set({ isDeleted: true, updatedAt: new Date() })
		.where(
			and(
				eq(folders.workspaceId, workspaceId),
				eq(folders.providerId, providerId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				eq(folders.virtualPath, rootVirtualPath),
			),
		);
}
