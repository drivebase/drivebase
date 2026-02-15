import type { Database } from "@drivebase/db";
import { deleteFile, moveFile, renameFile } from "./file/file-mutations";
import {
	getContents,
	getFile,
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

export class FileService {
	constructor(private db: Database) {}

	async requestUpload(
		userId: string,
		name: string,
		mimeType: string,
		size: number,
		folderId: string | undefined,
		providerId: string,
	) {
		return requestUpload(
			this.db,
			userId,
			name,
			mimeType,
			size,
			folderId,
			providerId,
		);
	}

	async getFile(fileId: string, userId: string) {
		return getFile(this.db, fileId, userId);
	}

	async listFiles(
		userId: string,
		folderId?: string,
		limit?: number,
		offset?: number,
	) {
		return listFiles(this.db, userId, folderId, limit, offset);
	}

	async searchFiles(userId: string, query: string, limit?: number) {
		return searchFiles(this.db, userId, query, limit);
	}

	async requestDownload(fileId: string, userId: string) {
		return requestDownload(this.db, fileId, userId);
	}

	async downloadFile(fileId: string, userId: string): Promise<ReadableStream> {
		return downloadFile(this.db, fileId, userId);
	}

	async renameFile(fileId: string, userId: string, newName: string) {
		return renameFile(this.db, fileId, userId, newName);
	}

	async moveFile(fileId: string, userId: string, newFolderId?: string) {
		return moveFile(this.db, fileId, userId, newFolderId);
	}

	async moveFileToProvider(fileId: string, userId: string, providerId: string) {
		return moveFileToProvider(this.db, fileId, userId, providerId);
	}

	async deleteFile(fileId: string, userId: string) {
		return deleteFile(this.db, fileId, userId);
	}

	async getFileMetadata(fileId: string, userId: string) {
		return getFileMetadata(this.db, fileId, userId);
	}

	async starFile(fileId: string, userId: string) {
		return starFile(this.db, fileId, userId);
	}

	async unstarFile(fileId: string, userId: string) {
		return unstarFile(this.db, fileId, userId);
	}

	async getContents(path: string) {
		return getContents(this.db, path);
	}

	async getStarredFiles(userId: string) {
		return getStarredFiles(this.db, userId);
	}
}
