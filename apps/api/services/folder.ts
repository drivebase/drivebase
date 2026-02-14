import type { Database } from "@drivebase/db";
import {
	createFolder,
	deleteFolder,
	moveFolder,
	renameFolder,
} from "./folder/folder-mutations";
import {
	getFolder,
	getStarredFolders,
	listFolders,
} from "./folder/folder-queries";
import { starFolder, unstarFolder } from "./folder/folder-stars";

export class FolderService {
	constructor(private db: Database) {}

	async createFolder(
		userId: string,
		name: string,
		parentId?: string,
		providerId?: string,
	) {
		return createFolder(this.db, userId, name, parentId, providerId);
	}

	async getFolder(folderId: string, userId: string) {
		return getFolder(this.db, folderId, userId);
	}

	async listFolders(userId: string, path?: string, parentId?: string) {
		return listFolders(this.db, userId, path, parentId);
	}

	async renameFolder(folderId: string, userId: string, newName: string) {
		return renameFolder(this.db, folderId, userId, newName);
	}

	async moveFolder(folderId: string, userId: string, newParentId?: string) {
		return moveFolder(this.db, folderId, userId, newParentId);
	}

	async deleteFolder(folderId: string, userId: string) {
		return deleteFolder(this.db, folderId, userId);
	}

	async starFolder(folderId: string, userId: string) {
		return starFolder(this.db, folderId, userId);
	}

	async unstarFolder(folderId: string, userId: string) {
		return unstarFolder(this.db, folderId, userId);
	}

	async getStarredFolders(userId: string) {
		return getStarredFolders(this.db, userId);
	}
}
