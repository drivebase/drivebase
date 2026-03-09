import type { Database } from "@drivebase/db";
import {
	createFolder,
	deleteFolder,
	moveFolder,
	renameFolder,
	starFolder,
	unstarFolder,
} from "./folder/mutation";
import { getFolder, getStarredFolders, listFolders } from "./folder/query";
import {
	getAccessibleProviderIds,
	getAccessibleWorkspaceId,
} from "./workspace";

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
		const allowedProviderIds = await getAccessibleProviderIds(
			this.db,
			workspaceId,
			userId,
		);
		// Intersect client-requested providerIds with access grants.
		let effectiveProviderIds = providerIds;
		if (allowedProviderIds) {
			effectiveProviderIds = providerIds
				? providerIds.filter((id) => allowedProviderIds.includes(id))
				: allowedProviderIds;
		}
		return listFolders(
			this.db,
			userId,
			workspaceId,
			parentId,
			effectiveProviderIds,
		);
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
		const allowedProviderIds = await getAccessibleProviderIds(
			this.db,
			workspaceId,
			userId,
		);
		return getStarredFolders(this.db, userId, workspaceId, allowedProviderIds);
	}
}
