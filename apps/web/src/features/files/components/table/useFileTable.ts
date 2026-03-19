import {
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useFileExplorer } from "../../context/FileExplorerProvider";
import { useSelection } from "../../context/SelectionContext";
import { useFileDetailsDialogStore } from "../../store/fileDetailsDialogStore";
import {
	COLUMN_VISIBILITY_STORAGE_KEY,
	type RowItem,
} from "../file-system-table/types";
import { useTableColumns } from "./TableColumns";

export function useFileTable() {
	const { files, folders, actionContext } = useFileExplorer();
	const { selectedItems, setItems } = useSelection();
	const openForFile = useFileDetailsDialogStore((s) => s.openForFile);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => {
			try {
				const stored = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
				if (stored) return JSON.parse(stored);
			} catch {
				/* ignore */
			}
			return {};
		},
	);

	useEffect(() => {
		try {
			localStorage.setItem(
				COLUMN_VISIBILITY_STORAGE_KEY,
				JSON.stringify(columnVisibility),
			);
		} catch {
			/* ignore */
		}
	}, [columnVisibility]);

	const data = useMemo<RowItem[]>(
		() => [
			...folders.map((folder) => ({
				kind: "folder" as const,
				id: `folder:${folder.id}`,
				folder,
			})),
			...files.map((file) => ({
				kind: "file" as const,
				id: `file:${file.id}`,
				file,
			})),
		],
		[files, folders],
	);

	const columns = useTableColumns({
		onNavigate: actionContext.navigate,
		onShowFileDetails: openForFile,
	});

	const rowSelection = useMemo<RowSelectionState>(() => {
		const ids: RowSelectionState = {};
		for (const item of selectedItems) {
			ids[`${item.kind}:${item.data.id}`] = true;
		}
		return ids;
	}, [selectedItems]);

	const handleRowSelectionChange = (
		updater:
			| RowSelectionState
			| ((prev: RowSelectionState) => RowSelectionState),
	) => {
		const next =
			typeof updater === "function" ? updater(rowSelection) : updater;
		const selected = data
			.filter((row) => next[row.id])
			.map((row) =>
				row.kind === "file"
					? { kind: "file" as const, data: row.file }
					: { kind: "folder" as const, data: row.folder },
			);
		setItems(selected);
	};

	const table = useReactTable({
		data,
		columns,
		getRowId: (row) => row.id,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onRowSelectionChange: handleRowSelectionChange,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnFiltersChange: setColumnFilters,
		state: { rowSelection, columnVisibility, columnFilters },
		columnResizeMode: "onChange",
		defaultColumn: { size: 140, minSize: 90 },
	});

	return {
		table,
		emptyColSpan: columns.length,
	};
}
