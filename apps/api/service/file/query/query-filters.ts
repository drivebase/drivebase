import { files, folders, storageProviders } from "@drivebase/db";
import { eq, inArray, isNull } from "drizzle-orm";

export function rootFileConditions(
	workspaceId: string,
	providerIds?: string[],
) {
	const conditions = [
		eq(files.nodeType, "file"),
		isNull(files.folderId),
		eq(files.isDeleted, false),
		isNull(files.vaultId),
		eq(storageProviders.workspaceId, workspaceId),
	];

	if (providerIds && providerIds.length > 0) {
		conditions.push(inArray(files.providerId, providerIds));
	}

	return conditions;
}

export function childFileConditions(
	workspaceId: string,
	folderId: string,
	providerIds?: string[],
) {
	const conditions = [
		eq(files.nodeType, "file"),
		eq(files.folderId, folderId),
		eq(files.isDeleted, false),
		isNull(files.vaultId),
		eq(storageProviders.workspaceId, workspaceId),
	];

	if (providerIds && providerIds.length > 0) {
		conditions.push(inArray(files.providerId, providerIds));
	}

	return conditions;
}

export function rootFolderConditions(
	workspaceId: string,
	providerIds?: string[],
) {
	const conditions = [
		eq(folders.nodeType, "folder"),
		isNull(folders.parentId),
		eq(folders.isDeleted, false),
		isNull(folders.vaultId),
		eq(folders.workspaceId, workspaceId),
	];

	if (providerIds && providerIds.length > 0) {
		conditions.push(inArray(folders.providerId, providerIds));
	}

	return conditions;
}

export function childFolderConditions(
	workspaceId: string,
	folderId: string,
	providerIds?: string[],
) {
	const conditions = [
		eq(folders.nodeType, "folder"),
		eq(folders.parentId, folderId),
		eq(folders.isDeleted, false),
		isNull(folders.vaultId),
		eq(folders.workspaceId, workspaceId),
	];

	if (providerIds && providerIds.length > 0) {
		conditions.push(inArray(folders.providerId, providerIds));
	}

	return conditions;
}
