import { basename, extname } from "node:path";
import { getParentPath, joinPath } from "@drivebase/core";
import {
	type Folder,
	files,
	folders,
	getDb,
	storageProviders,
} from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";

export async function checkFileConflict(
	virtualPath: string,
	providerId: string,
	excludingFileId?: string,
) {
	const db = getDb();
	const [existing] = await db
		.select()
		.from(files)
		.where(
			and(
				eq(files.nodeType, "file"),
				eq(files.virtualPath, virtualPath),
				eq(files.providerId, providerId),
				eq(files.isDeleted, false),
			),
		)
		.limit(1);

	if (existing && existing.id !== excludingFileId) {
		return existing;
	}
	return null;
}

export async function getUniqueFilename(
	virtualPath: string,
	providerId: string,
): Promise<{ name: string; path: string }> {
	const db = getDb();
	const parentPath = getParentPath(virtualPath);
	const name = basename(virtualPath);
	const ext = extname(name);
	const baseName = basename(name, ext);

	let counter = 1;
	let currentName = name;
	let currentPath = virtualPath;

	while (true) {
		const [existing] = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.virtualPath, currentPath),
					eq(files.providerId, providerId),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (!existing) {
			return { name: currentName, path: currentPath };
		}

		currentName = `${baseName} (${counter})${ext}`;
		currentPath = joinPath(parentPath, currentName);
		counter++;
	}
}

export async function checkFolderConflict(
	virtualPath: string,
	providerId: string,
): Promise<Folder | null> {
	const db = getDb();
	const [existing] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.nodeType, "folder"),
				eq(folders.virtualPath, virtualPath),
				eq(folders.providerId, providerId),
				eq(folders.isDeleted, false),
			),
		)
		.limit(1);

	return existing ?? null;
}

export async function getUniqueFolderName(
	virtualPath: string,
	providerId: string,
): Promise<{ name: string; path: string }> {
	const parentPath = getParentPath(virtualPath);
	const name = basename(virtualPath);

	let counter = 1;
	let currentName = `${name} (${counter})`;
	let currentPath = joinPath(parentPath, currentName);

	while (true) {
		const existing = await checkFolderConflict(currentPath, providerId);
		if (!existing) {
			return { name: currentName, path: currentPath };
		}
		counter += 1;
		currentName = `${name} (${counter})`;
		currentPath = joinPath(parentPath, currentName);
	}
}

export async function getTargetFolder(
	workspaceId: string,
	targetFolderId: string | null,
) {
	if (!targetFolderId) return null;
	const db = getDb();
	const [folderRow] = await db
		.select()
		.from(folders)
		.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
		.where(
			and(
				eq(folders.id, targetFolderId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);
	return folderRow?.nodes ?? null;
}
