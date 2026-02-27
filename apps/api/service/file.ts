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
	renameFile,
	requestFileRestore,
	refreshFileLifecycle,
	requestDownload,
	requestUpload,
	revokeFileDownloadLink,
	searchFiles,
	searchFilesAi,
	searchFolders,
	starFile,
	unstarFile,
} from "./file/index";
import { getAccessibleWorkspaceId } from "./workspace";

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
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			listFiles(this.db, userId, workspaceId, folderId, limit, offset),
		);
	}

	searchFiles(
		userId: string,
		query: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			searchFiles(this.db, userId, workspaceId, query, limit),
		);
	}

	searchFilesAi(
		userId: string,
		query: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			searchFilesAi(this.db, userId, workspaceId, query, limit),
		);
	}

	searchFolders(
		userId: string,
		query: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			searchFolders(this.db, userId, workspaceId, query, limit),
		);
	}

	getRecentFiles(
		userId: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			getRecentFiles(this.db, userId, workspaceId, limit),
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
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			getContents(this.db, workspaceId, userId, folderId, providerIds),
		);
	}

	getStarredFiles(userId: string, preferredWorkspaceId?: string) {
		return this.withWorkspace(userId, preferredWorkspaceId, (workspaceId) =>
			getStarredFiles(this.db, userId, workspaceId),
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
}
