import type { Database } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { and, eq, like, sql } from "drizzle-orm";

// Rewrite descendant virtual paths when a folder path prefix changes.
export async function updateDescendantVirtualPaths(
	db: Database,
	oldVirtualPath: string,
	newVirtualPath: string,
) {
	const oldPathPrefix = `${oldVirtualPath}/`;
	const newPathPrefix = `${newVirtualPath}/`;
	const prefixLength = oldPathPrefix.length;

	await db
		.update(folders)
		.set({
			virtualPath: sql`${newPathPrefix} || SUBSTR(${folders.virtualPath}, ${prefixLength + 1})`,
			updatedAt: new Date(),
		})
		.where(
			and(
				like(folders.virtualPath, `${oldPathPrefix}%`),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
			),
		);

	await db
		.update(files)
		.set({
			virtualPath: sql`${newPathPrefix} || SUBSTR(${files.virtualPath}, ${prefixLength + 1})`,
			updatedAt: new Date(),
		})
		.where(
			and(
				like(files.virtualPath, `${oldPathPrefix}%`),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
			),
		);
}
