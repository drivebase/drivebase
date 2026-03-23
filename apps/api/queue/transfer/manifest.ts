import { getParentPath } from "@drivebase/core";
import { files, folders, getDb, storageProviders } from "@drivebase/db";
import { and, eq, inArray, isNull, like, or } from "drizzle-orm";
import { getFile } from "@/service/file/query/file-read";
import type {
	TransferFileEntry,
	TransferFolderEntry,
	TransferManifest,
	TransferRootEntry,
	TransferSourceItem,
} from "@/service/file/transfer/transfer-session";
import { getRelativePath, syncManifestCounts } from "./utils";

export async function buildTransferManifest(
	userId: string,
	workspaceId: string,
	sourceItems: TransferSourceItem[],
	targetFolderId: string | null,
	targetProviderId: string,
): Promise<TransferManifest> {
	const db = getDb();
	const roots: TransferRootEntry[] = [];
	const foldersForManifest: TransferFolderEntry[] = [];
	const filesForManifest: TransferFileEntry[] = [];

	for (const sourceItem of sourceItems) {
		if (sourceItem.kind === "file") {
			const file = await getFile(db, sourceItem.id, userId, workspaceId);

			filesForManifest.push({
				id: `file:${file.id}`,
				sourceFileId: file.id,
				sourceProviderId: file.providerId,
				sourceVirtualPath: file.virtualPath,
				sourceRootId: null,
				name: file.name,
				relativeDirPath: "",
				status: "pending",
				isHidden: file.name.startsWith("."),
			});
			continue;
		}

		const [sourceFolderRow] = await db
			.select()
			.from(folders)
			.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
			.where(
				and(
					eq(folders.id, sourceItem.id),
					eq(folders.nodeType, "folder"),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(1);
		const sourceFolder = sourceFolderRow?.nodes ?? null;

		if (!sourceFolder) {
			throw new Error(`Source folder not found: ${sourceItem.id}`);
		}

		const rootId = `root:${sourceFolder.id}`;
		roots.push({
			id: rootId,
			kind: "folder",
			sourceFolderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			sourceVirtualPath: sourceFolder.virtualPath,
			sourceRemoteId: sourceFolder.remoteId,
			originalName: sourceFolder.name,
			resolvedName: sourceFolder.name,
			status: "pending",
		});

		foldersForManifest.push({
			id: `folder:${sourceFolder.id}`,
			sourceFolderId: sourceFolder.id,
			sourceProviderId: sourceFolder.providerId,
			sourceVirtualPath: sourceFolder.virtualPath,
			sourceRootId: rootId,
			name: sourceFolder.name,
			relativePath: "",
			status: "pending",
		});

		const descendantFolders = await db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.providerId, sourceFolder.providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.isDeleted, false),
					like(folders.virtualPath, `${sourceFolder.virtualPath}/%`),
				),
			)
			.orderBy(folders.virtualPath);

		const folderRelativePathById = new Map<string, string>([
			[sourceFolder.id, ""],
		]);
		for (const descendantFolder of descendantFolders) {
			const relativePath = getRelativePath(
				sourceFolder.virtualPath,
				descendantFolder.virtualPath,
			);
			folderRelativePathById.set(descendantFolder.id, relativePath);
			foldersForManifest.push({
				id: `folder:${descendantFolder.id}`,
				sourceFolderId: descendantFolder.id,
				sourceProviderId: descendantFolder.providerId,
				sourceVirtualPath: descendantFolder.virtualPath,
				sourceRootId: rootId,
				name: descendantFolder.name,
				relativePath,
				status: "pending",
			});
		}

		const subtreeFolderIds = [
			sourceFolder.id,
			...descendantFolders.map((folder) => folder.id),
		];
		const descendantFiles = await db
			.select({
				id: files.id,
				name: files.name,
				virtualPath: files.virtualPath,
				providerId: files.providerId,
				folderId: files.folderId,
			})
			.from(files)
			.where(
				and(
					eq(files.providerId, sourceFolder.providerId),
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					or(
						inArray(files.folderId, subtreeFolderIds),
						like(files.virtualPath, `${sourceFolder.virtualPath}/%`),
					),
				),
			)
			.orderBy(files.virtualPath);

		for (const descendantFile of descendantFiles) {
			const relativeDirPath = descendantFile.folderId
				? (folderRelativePathById.get(descendantFile.folderId) ?? "")
				: getRelativePath(
						sourceFolder.virtualPath,
						getParentPath(descendantFile.virtualPath),
					);

			filesForManifest.push({
				id: `file:${descendantFile.id}`,
				sourceFileId: descendantFile.id,
				sourceProviderId: descendantFile.providerId,
				sourceVirtualPath: descendantFile.virtualPath,
				sourceRootId: rootId,
				name: descendantFile.name,
				relativeDirPath,
				status: "pending",
				isHidden: descendantFile.name.startsWith("."),
			});
		}
	}

	const hiddenFiles = filesForManifest.filter((file) => file.isHidden).length;

	return syncManifestCounts({
		targetFolderId,
		targetProviderId,
		roots,
		folders: foldersForManifest,
		files: filesForManifest,
		preflightComplete: false,
		completedFiles: 0,
		failedFiles: 0,
		skippedFiles: 0,
		totalFiles: filesForManifest.length,
		hiddenFiles,
		currentConflict: null,
	});
}
