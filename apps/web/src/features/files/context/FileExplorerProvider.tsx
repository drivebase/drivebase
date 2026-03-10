import { createContext, useContext, useMemo } from "react";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import type { ActionRegistry } from "../actions/registry";
import type { ActionContext, ProviderInfo } from "../actions/types";
import { SelectionProvider, useSelection } from "./SelectionContext";

interface FileExplorerContextValue {
	registry: ActionRegistry;
	actionContext: ActionContext;
	files: FileItemFragment[];
	folders: FolderItemFragment[];
	providers: ProviderInfo[];
	currentFolderId: string | undefined;
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
	isLoading,
	canWrite,
	navigate,
	refresh,
}: FileExplorerProviderProps) {
	const { effectiveSelection } = useSelection();

	const actionContext = useMemo<ActionContext>(
		() => ({
			selection: effectiveSelection,
			providers,
			currentFolderId,
			navigate,
			refresh,
		}),
		[effectiveSelection, providers, currentFolderId, navigate, refresh],
	);

	const value = useMemo<FileExplorerContextValue>(
		() => ({
			registry,
			actionContext,
			files,
			folders,
			providers,
			currentFolderId,
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
