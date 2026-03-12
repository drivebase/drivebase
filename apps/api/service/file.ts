import type { Database } from "@drivebase/db";
import {
	archiveFile,
	consumeFileDownloadLink,
	createFileDownloadLink,
	deleteFile,
	downloadFile,
	downloadFileForProxy,
	getContents,
	getFile,
	getFileForProxy,
	getFileMetadata,
	getRecentFiles,
	getStarredFiles,
	listActiveFileDownloadLinks,
	listFiles,
	moveFile,
	moveFileToProvider,
	pasteSelection,
	refreshFileLifecycle,
	renameFile,
	requestDownload,
	requestFileRestore,
	requestUpload,
	revokeFileDownloadLink,
	searchFiles,
	searchFolders,
	smartSearch,
	starFile,
	unstarFile,
} from "./file/index";
import {
	getAccessibleProviderIds,
	getAccessibleWorkspaceId,
} from "./workspace";
import type {
	ClipboardItemInput,
	PasteOperation,
	PasteSelectionResult,
} from "./file/transfer/paste-selection";

export class FileService {
	constructor(private db: Database) {}

	private async withWorkspace<T>(
		userId: string,
		preferredWorkspaceId: string | undefined,
		run: (workspaceId: string) => Promise<T>,
	): Promise<T> {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return run(workspaceId);
	}

	private async withWorkspaceAndAccess<T>(
		userId: string,
		preferredWorkspaceId: string | undefined,
		run: (
			workspaceId: string,
			allowedProviderIds: string[] | null,
		) => Promise<T>,
	): Promise<T> {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		const allowedProviderIds = await getAccessibleProviderIds(
			this.db,
			workspaceId,
			userId,
		);
		return run(workspaceId, allowedProviderIds);
	}

	requestUpload(
		userId: string,
		name: string,
		mimeType: string,
		size: number,
		folderId: string | undefined,
		providerId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			requestUpload(
				this.db,
				userId,
				workspaceId,
				name,
				mimeType,
				size,
				folderId,
				providerId,
			),
		);
	}

	getFile(fileId: string, userId: string, preferredWorkspaceId?: string) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			getFile(this.db, fileId, userId, workspaceId),
		);
	}

	getFileForProxy(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			getFileForProxy(this.db, fileId, workspaceId),
		);
	}

	listFiles(
		userId: string,
		preferredWorkspaceId?: string,
		folderId?: string,
		limit?: number,
		offset?: number,
	) {
		return this.withWorkspaceAndAccess(
			userId,
			preferredWorkspaceId,
			(workspaceId, allowedProviderIds) =>
				listFiles(
					this.db,
					userId,
					workspaceId,
					folderId,
					limit,
					offset,
					allowedProviderIds,
				),
		);
	}

	searchFiles(
		userId: string,
		query: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspaceAndAccess(
			userId,
			preferredWorkspaceId,
			(workspaceId, allowedProviderIds) =>
				searchFiles(
					this.db,
					userId,
					workspaceId,
					query,
					limit,
					allowedProviderIds,
				),
		);
	}

	searchFolders(
		userId: string,
		query: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspaceAndAccess(
			userId,
			preferredWorkspaceId,
			(workspaceId, allowedProviderIds) =>
				searchFolders(
					this.db,
					userId,
					workspaceId,
					query,
					limit,
					allowedProviderIds,
				),
		);
	}

	getRecentFiles(
		userId: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspaceAndAccess(
			userId,
			preferredWorkspaceId,
			(workspaceId, allowedProviderIds) =>
				getRecentFiles(this.db, userId, workspaceId, limit, allowedProviderIds),
		);
	}

	requestDownload(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			requestDownload(this.db, fileId, userId, workspaceId),
		);
	}

	downloadFile(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	): Promise<ReadableStream> {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			downloadFile(this.db, fileId, userId, workspaceId),
		);
	}

	downloadFileForProxy(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	): Promise<ReadableStream> {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			downloadFileForProxy(this.db, fileId, userId, workspaceId),
		);
	}

	renameFile(
		fileId: string,
		userId: string,
		newName: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			renameFile(this.db, fileId, userId, newName, workspaceId),
		);
	}

	moveFile(
		fileId: string,
		userId: string,
		newFolderId?: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			moveFile(this.db, fileId, userId, workspaceId, newFolderId),
		);
	}

	moveFileToProvider(
		fileId: string,
		userId: string,
		providerId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			moveFileToProvider(this.db, fileId, userId, providerId, workspaceId),
		);
	}

	pasteSelection(
		userId: string,
		operation: PasteOperation,
		targetFolderId: string | null,
		items: ClipboardItemInput[],
		preferredWorkspaceId?: string,
	): Promise<PasteSelectionResult> {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			pasteSelection(
				this.db,
				userId,
				workspaceId,
				operation,
				targetFolderId,
				items,
			),
		);
	}

	archiveFile(fileId: string, userId: string, preferredWorkspaceId?: string) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			archiveFile(this.db, fileId, userId, workspaceId),
		);
	}

	requestFileRestore(
		fileId: string,
		userId: string,
		days: number,
		tier: "fast" | "standard" | "bulk",
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			requestFileRestore(this.db, fileId, userId, workspaceId, days, tier),
		);
	}

	refreshFileLifecycle(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			refreshFileLifecycle(this.db, fileId, userId, workspaceId),
		);
	}

	deleteFile(fileId: string, userId: string, preferredWorkspaceId?: string) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			deleteFile(this.db, fileId, userId, workspaceId),
		);
	}

	getFileMetadata(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			getFileMetadata(this.db, fileId, userId, workspaceId),
		);
	}

	starFile(fileId: string, userId: string, preferredWorkspaceId?: string) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			starFile(this.db, fileId, userId, workspaceId),
		);
	}

	unstarFile(fileId: string, userId: string, preferredWorkspaceId?: string) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			unstarFile(this.db, fileId, userId, workspaceId),
		);
	}

	getContents(
		userId: string,
		preferredWorkspaceId?: string,
		folderId?: string,
		providerIds?: string[],
	) {
		return this.withWorkspaceAndAccess(
			userId,
			preferredWorkspaceId,
			(workspaceId, allowedProviderIds) => {
				// Intersect client-requested providerIds with access grants.
				// If user has restrictions, only show providers they're allowed to see.
				let effectiveProviderIds = providerIds;
				if (allowedProviderIds) {
					effectiveProviderIds = providerIds
						? providerIds.filter((id) => allowedProviderIds.includes(id))
						: allowedProviderIds;
				}
				return getContents(
					this.db,
					workspaceId,
					userId,
					folderId,
					effectiveProviderIds,
				);
			},
		);
	}

	getStarredFiles(userId: string, preferredWorkspaceId?: string) {
		return this.withWorkspaceAndAccess(
			userId,
			preferredWorkspaceId,
			(workspaceId, allowedProviderIds) =>
				getStarredFiles(this.db, userId, workspaceId, allowedProviderIds),
		);
	}

	createFileDownloadLink(
		fileId: string,
		userId: string,
		maxDownloads: number,
		expiresAt: Date,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			createFileDownloadLink(
				this.db,
				fileId,
				userId,
				workspaceId,
				maxDownloads,
				expiresAt,
			),
		);
	}

	listActiveFileDownloadLinks(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			listActiveFileDownloadLinks(this.db, fileId, userId, workspaceId),
		);
	}

	revokeFileDownloadLink(
		downloadLinkId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			revokeFileDownloadLink(this.db, downloadLinkId, workspaceId),
		);
	}

	consumeFileDownloadLink(token: string) {
		return consumeFileDownloadLink(this.db, token);
	}

	smartSearch(
		userId: string,
		query: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspaceAndAccess(
			userId,
			preferredWorkspaceId,
			(workspaceId, allowedProviderIds) =>
				smartSearch(this.db, workspaceId, query, limit, allowedProviderIds),
		);
	}
}
