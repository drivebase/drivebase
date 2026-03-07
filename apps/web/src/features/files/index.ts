// Context
export { FileExplorerProvider } from "./context/FileExplorerProvider";
export { useFileExplorer } from "./context/FileExplorerProvider";
export { useSelection } from "./context/SelectionContext";

// Actions
export { useActions } from "./actions/useActions";
export type {
	FileAction,
	ActionContext,
	SelectionItem,
	ProviderInfo,
} from "./actions/types";

// Components
export { FileExplorer } from "./components/FileExplorer";
export { FileContextMenu } from "./components/ContextMenu";
export { CreateFolderDialog } from "./CreateFolderDialog";
export { DroppableBreadcrumb } from "./components/DroppableBreadcrumb";
export { FileDropZone } from "./components/FileDropZone";
export { FilesToolbar } from "./components/FilesToolbar";
export { ProviderFilter } from "./components/ProviderFilter";
export { FileDetailsDialog } from "./FileDetailsDialog";
export { FileInfoPanel } from "./FileInfoPanel";
export { FileMimeIcon } from "./FileMimeIcon";
export { FolderCard } from "./FolderCard";
export { UploadProviderDialog } from "./UploadProviderDialog";

// Legacy re-exports for DnD overlay
export type { DragItem } from "./components/file-system-table/types";
export { DragOverlayContent } from "./components/file-system-table/DragOverlayContent";

// Hooks
export { useBreadcrumbs } from "./hooks/useBreadcrumbs";
export { useChunkedUpload } from "./hooks/useChunkedUpload";
export { useDownload } from "./hooks/useDownload";
export { useDragAndDrop } from "./hooks/useDragAndDrop";
export { useFileDrop } from "./hooks/useFileDrop";
export { useFileOperations } from "./hooks/useFileOperations";
export { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
export {
	useContents,
	useDeleteFile,
	useFile,
	useFiles,
	useMoveFile,
	useRenameFile,
	useRequestDownload,
	useRequestUpload,
	useSearchFiles,
	useStarFile,
	useStarredFiles,
	useUnstarFile,
} from "./hooks/useFiles";
export {
	useCreateFolder,
	useDeleteFolder,
	useFolder,
	useFolders,
	useMoveFolder,
	useRenameFolder,
	useStarFolder,
	useStarredFolders,
	useUnstarFolder,
} from "./hooks/useFolders";
export { useUpload } from "./hooks/useUpload";
export { useFileActions } from "./useFileActions";

// Utils & Types
export { formatFileTypeLabel, formatSize } from "./utils";
