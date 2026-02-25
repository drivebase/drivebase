import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, storageProviders } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";

export async function getFile(
	db: Database,
	fileId: string,
	_userId: string,
	workspaceId: string,
) {
	const [file] = await db
		.select()
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.id, fileId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!file?.nodes) {
		throw new NotFoundError("File");
	}

	return file.nodes;
}

export async function getFileForProxy(
	db: Database,
	fileId: string,
	workspaceId: string,
) {
	const [file] = await db
		.select()
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.id, fileId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!file?.nodes) {
		throw new NotFoundError("File");
	}

	return file.nodes;
}
