import { createContext, useContext, useMemo } from "react";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import type { ActionRegistry } from "../actions/registry";
import type { ActionContext, ProviderInfo } from "../actions/types";
import { useClipboardStore } from "../store/clipboardStore";
import { SelectionProvider, useSelection } from "./SelectionContext";

interface FileExplorerContextValue {
	registry: ActionRegistry;
	actionContext: ActionContext;
	files: FileItemFragment[];
	folders: FolderItemFragment[];
	providers: ProviderInfo[];
	currentFolderId: string | undefined;
	currentFolderName: string | undefined;
	isLoading: boolean;
	canWrite: boolean;
}

const FileExplorerContext = createContext<FileExplorerContextValue | null>(
	null,
);

interface FileExplorerProviderProps {
	children: React.ReactNode;
	registry: ActionRegistry;
	files: FileItemFragment[];
	folders: FolderItemFragment[];
	providers: ProviderInfo[];
	currentFolderId: string | undefined;
	currentFolderName: string | undefined;
	isLoading: boolean;
	canWrite: boolean;
	navigate: (folderId: string) => void;
	refresh: () => void;
}

function FileExplorerInner({
	children,
	registry,
	files,
	folders,
	providers,
	currentFolderId,
	currentFolderName,
	isLoading,
	canWrite,
	navigate,
	refresh,
}: FileExplorerProviderProps) {
	const { effectiveSelection, clear } = useSelection();
	const clipboardMode = useClipboardStore((s) => s.mode);
	const clipboardStatus = useClipboardStore((s) => s.status);
	const clipboardCount = useClipboardStore((s) => s.items.length);

	const actionContext = useMemo<ActionContext>(
		() => ({
			selection: effectiveSelection,
			clearSelection: clear,
			providers,
			currentFolderId,
			currentFolderName,
			clipboard: {
				mode: clipboardMode,
				status: clipboardStatus,
				count: clipboardCount,
			},
			navigate,
			refresh,
		}),
		[
			effectiveSelection,
			clear,
			providers,
			currentFolderId,
			currentFolderName,
			clipboardMode,
			clipboardStatus,
			clipboardCount,
			navigate,
			refresh,
		],
	);

	const value = useMemo<FileExplorerContextValue>(
		() => ({
			registry,
			actionContext,
			files,
			folders,
			providers,
			currentFolderId,
			currentFolderName,
			isLoading,
			canWrite,
		}),
		[
			registry,
			actionContext,
			files,
			folders,
			providers,
			currentFolderId,
			currentFolderName,
			isLoading,
			canWrite,
		],
	);

	return (
		<FileExplorerContext.Provider value={value}>
			{children}
		</FileExplorerContext.Provider>
	);
}

export function FileExplorerProvider(props: FileExplorerProviderProps) {
	return (
		<SelectionProvider>
			<FileExplorerInner {...props} />
		</SelectionProvider>
	);
}

export function useFileExplorer(): FileExplorerContextValue {
	const ctx = useContext(FileExplorerContext);
	if (!ctx) {
		throw new Error("useFileExplorer must be used within FileExplorerProvider");
	}
	return ctx;
}
