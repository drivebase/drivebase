import type { HttpClient } from "../http.ts";
import {
	CREATE_FOLDER,
	DELETE_FOLDER,
	MOVE_FOLDER,
	RENAME_FOLDER,
	STAR_FOLDER,
	UNSTAR_FOLDER,
} from "../operations/folder-mutations.ts";
import {
	GET_FOLDER,
	LIST_FOLDERS,
	STARRED_FOLDERS,
} from "../operations/folder-queries.ts";
import type {
	CreateFolderParams,
	Folder,
	ListFoldersParams,
} from "../types.ts";

export class FoldersResource {
	constructor(private readonly http: HttpClient) {}

	/** Get a folder by ID (returns null if not found) */
	async get(id: string): Promise<Folder | null> {
		const data = await this.http.graphql<{ folder: Folder | null }>(
			GET_FOLDER,
			{ id },
		);
		return data.folder;
	}

	/** List folders by parent (omit parentId for root folders) */
	async list(params: ListFoldersParams = {}): Promise<Folder[]> {
		const data = await this.http.graphql<{ folders: Folder[] }>(LIST_FOLDERS, {
			parentId: params.parentId,
			providerIds: params.providerIds,
		});
		return data.folders;
	}

	/** Get starred folders */
	async starred(): Promise<Folder[]> {
		const data = await this.http.graphql<{ starredFolders: Folder[] }>(
			STARRED_FOLDERS,
		);
		return data.starredFolders;
	}

	/** Create a new folder */
	async create(params: CreateFolderParams): Promise<Folder> {
		const data = await this.http.graphql<{ createFolder: Folder }>(
			CREATE_FOLDER,
			{
				input: {
					name: params.name,
					providerId: params.providerId,
					parentId: params.parentId,
				},
			},
		);
		return data.createFolder;
	}

	/** Rename a folder */
	async rename(id: string, name: string): Promise<Folder> {
		const data = await this.http.graphql<{ renameFolder: Folder }>(
			RENAME_FOLDER,
			{ id, name },
		);
		return data.renameFolder;
	}

	/** Move a folder to a different parent (pass null/undefined for root) */
	async move(id: string, parentId?: string | null): Promise<Folder> {
		const data = await this.http.graphql<{ moveFolder: Folder }>(MOVE_FOLDER, {
			id,
			parentId: parentId ?? null,
		});
		return data.moveFolder;
	}

	/** Delete a folder (soft delete) */
	async delete(id: string): Promise<boolean> {
		const data = await this.http.graphql<{ deleteFolder: boolean }>(
			DELETE_FOLDER,
			{ id },
		);
		return data.deleteFolder;
	}

	/** Star a folder */
	async star(id: string): Promise<Folder> {
		const data = await this.http.graphql<{ starFolder: Folder }>(STAR_FOLDER, {
			id,
		});
		return data.starFolder;
	}

	/** Unstar a folder */
	async unstar(id: string): Promise<Folder> {
		const data = await this.http.graphql<{ unstarFolder: Folder }>(
			UNSTAR_FOLDER,
			{ id },
		);
		return data.unstarFolder;
	}
}
