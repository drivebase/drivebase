import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";

export type FileRow = { kind: "file"; id: string; file: FileItemFragment };
export type FolderRow = {
	kind: "folder";
	id: string;
	folder: FolderItemFragment;
};
export type RowItem = FileRow | FolderRow;

export type DragItem = {
	type: "file" | "folder";
	id: string;
	name: string;
	item: FileItemFragment | FolderItemFragment;
};

export type ProviderInfo = {
	id: string;
	name: string;
	type: string;
};

export interface FileSystemTableHandlers {
	onNavigate?: (folderId: string) => void;
	onDownloadFile?: (file: FileItemFragment) => void;
	onCreateDownloadLink?: (file: FileItemFragment) => void;
	onShowFileDetails?: (file: FileItemFragment) => void;
	onToggleFileFavorite?: (file: FileItemFragment) => void;
	onToggleFolderFavorite?: (folder: FolderItemFragment) => void;
	onRenameFile?: (file: FileItemFragment) => void;
	onRenameFolder?: (folder: FolderItemFragment) => void;
	onMoveFileToProvider?: (file: FileItemFragment, providerId: string) => void;
	onDeleteSelection?: (selection: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => Promise<void> | void;
}

export const COLUMN_VISIBILITY_STORAGE_KEY = "drivebase:file-table-columns";
