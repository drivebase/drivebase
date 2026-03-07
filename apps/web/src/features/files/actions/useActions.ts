import { useMemo } from "react";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { createActionRegistry } from "./registry";
import { createBulkActions } from "./bulk-actions";
import { createFileActions } from "./file-actions";
import { createFolderActions } from "./folder-actions";

interface UseActionsOptions {
	canWrite: boolean;
	downloadFile: (file: FileItemFragment) => Promise<void>;
	showDetails: (file: FileItemFragment) => void;
	createDownloadLink: (file: FileItemFragment) => Promise<void>;
	renameFile: (file: FileItemFragment) => Promise<void>;
	renameFolder: (folder: FolderItemFragment) => Promise<void>;
	toggleFileFavorite: (file: FileItemFragment) => Promise<void>;
	toggleFolderFavorite: (folder: FolderItemFragment) => Promise<void>;
	deleteSelection: (selection: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => Promise<void>;
}

export function useActions(opts: UseActionsOptions) {
	return useMemo(() => {
		const allActions = [
			...createFileActions({
				canWrite: opts.canWrite,
				downloadFile: opts.downloadFile,
				showDetails: opts.showDetails,
				createDownloadLink: opts.createDownloadLink,
				renameFile: opts.renameFile,
				toggleFileFavorite: opts.toggleFileFavorite,
			}),
			...createFolderActions({
				canWrite: opts.canWrite,
				renameFolder: opts.renameFolder,
				toggleFolderFavorite: opts.toggleFolderFavorite,
			}),
			...createBulkActions({
				canWrite: opts.canWrite,
				deleteSelection: opts.deleteSelection,
			}),
		];

		return createActionRegistry(allActions);
	}, [
		opts.canWrite,
		opts.downloadFile,
		opts.showDetails,
		opts.createDownloadLink,
		opts.renameFile,
		opts.renameFolder,
		opts.toggleFileFavorite,
		opts.toggleFolderFavorite,
		opts.deleteSelection,
	]);
}
