import type { Database } from "@drivebase/db";
import { deleteFile, moveFile, renameFile } from "./file/file-mutations";
import {
	getContents,
	getFile,
	getFileForProxy,
	getStarredFiles,
	listFiles,
	searchFiles,
} from "./file/file-queries";
import { starFile, unstarFile } from "./file/file-stars";
import {
	downloadFile,
	getFileMetadata,
	moveFileToProvider,
	requestDownload,
	requestUpload,
} from "./file/file-transfers";
import { getAccessibleWorkspaceId } from "./workspace/workspace";

export class FileService {
	constructor(private db: Database) {}

	async requestUpload(
		userId: string,
		name: string,
		mimeType: string,
		size: number,
		folderId: string | undefined,
		providerId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return requestUpload(
			this.db,
			userId,
			workspaceId,
			name,
			mimeType,
			size,
			folderId,
			providerId,
		);
	}

	async getFile(fileId: string, userId: string, preferredWorkspaceId?: string) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getFile(this.db, fileId, userId, workspaceId);
	}

	async getFileForProxy(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getFileForProxy(this.db, fileId, workspaceId);
	}

	async listFiles(
		userId: string,
		preferredWorkspaceId?: string,
		folderId?: string,
		limit?: number,
		offset?: number,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return listFiles(this.db, userId, workspaceId, folderId, limit, offset);
	}

	async searchFiles(
		userId: string,
		query: string,
		limit?: number,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return searchFiles(this.db, userId, workspaceId, query, limit);
	}

	async requestDownload(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return requestDownload(this.db, fileId, userId, workspaceId);
	}

	async downloadFile(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	): Promise<ReadableStream> {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return downloadFile(this.db, fileId, userId, workspaceId);
	}

	async renameFile(
		fileId: string,
		userId: string,
		newName: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return renameFile(this.db, fileId, userId, newName, workspaceId);
	}

	async moveFile(
		fileId: string,
		userId: string,
		newFolderId?: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return moveFile(this.db, fileId, userId, workspaceId, newFolderId);
	}

	async moveFileToProvider(
		fileId: string,
		userId: string,
		providerId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return moveFileToProvider(this.db, fileId, userId, providerId, workspaceId);
	}

	async deleteFile(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return deleteFile(this.db, fileId, userId, workspaceId);
	}

	async getFileMetadata(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getFileMetadata(this.db, fileId, userId, workspaceId);
	}

	async starFile(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return starFile(this.db, fileId, userId, workspaceId);
	}

	async unstarFile(
		fileId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return unstarFile(this.db, fileId, userId, workspaceId);
	}

	async getContents(
		path: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getContents(this.db, path, workspaceId);
	}

	async getStarredFiles(userId: string, preferredWorkspaceId?: string) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getStarredFiles(this.db, userId, workspaceId);
	}
}
