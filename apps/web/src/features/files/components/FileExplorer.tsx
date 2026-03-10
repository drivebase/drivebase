import { useFilesStore } from "@/shared/store/filesStore";
import type { SelectionItem } from "../actions/types";
import { useFileExplorer } from "../context/FileExplorerProvider";
import { useSelection } from "../context/SelectionContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { FileSystemTableEmpty } from "./file-system-table/FileSystemTableEmpty";
import { FileSystemTableLoading } from "./file-system-table/FileSystemTableLoading";
import { GridView } from "./grid/GridView";
import { TableView } from "./table/TableView";

export function FileExplorer() {
	const { files, folders, isLoading, registry, actionContext } =
		useFileExplorer();
	const { selectAll, selectOnly, clear } = useSelection();
	const viewMode = useFilesStore((s) => s.viewMode);

	const allItems: SelectionItem[] = [
		...folders.map((f) => ({ kind: "folder" as const, data: f })),
		...files.map((f) => ({ kind: "file" as const, data: f })),
	];

	useKeyboardShortcuts({
		registry,
		actionContext,
		allItems,
		onSelectAll: () => selectAll(allItems),
		onSelectOnly: selectOnly,
		onClearSelection: clear,
	});

	if (isLoading) {
		return <FileSystemTableLoading />;
	}

	if (files.length === 0 && folders.length === 0) {
		return <FileSystemTableEmpty />;
	}

	return viewMode === "grid" ? <GridView /> : <TableView />;
}
