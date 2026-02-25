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
import { getAccessibleWorkspaceId } from "./workspace";

export class FolderService {
	constructor(private db: Database) {}

	async createFolder(
		userId: string,
		name: string,
		providerId: string,
		parentId?: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return createFolder(
			this.db,
			userId,
			workspaceId,
			name,
			providerId,
			parentId,
		);
	}

	async getFolder(
		folderId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getFolder(this.db, folderId, userId, workspaceId);
	}

	async listFolders(
		userId: string,
		parentId?: string,
		providerIds?: string[],
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return listFolders(this.db, userId, workspaceId, parentId, providerIds);
	}

	async renameFolder(
		folderId: string,
		userId: string,
		newName: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return renameFolder(this.db, folderId, userId, workspaceId, newName);
	}

	async moveFolder(
		folderId: string,
		userId: string,
		newParentId?: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return moveFolder(this.db, folderId, userId, workspaceId, newParentId);
	}

	async deleteFolder(
		folderId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return deleteFolder(this.db, folderId, userId, workspaceId);
	}

	async starFolder(
		folderId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return starFolder(this.db, folderId, userId, workspaceId);
	}

	async unstarFolder(
		folderId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return unstarFolder(this.db, folderId, userId, workspaceId);
	}

	async getStarredFolders(userId: string, preferredWorkspaceId?: string) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getStarredFolders(this.db, userId, workspaceId);
	}
}
