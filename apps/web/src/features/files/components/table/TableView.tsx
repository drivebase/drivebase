import {
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useFileExplorer } from "../../context/FileExplorerProvider";
import { useSelection } from "../../context/SelectionContext";
import { useFileDetailsDialogStore } from "../../store/fileDetailsDialogStore";
import {
	COLUMN_VISIBILITY_STORAGE_KEY,
	type RowItem,
} from "../file-system-table/types";
import { Toolbar } from "../Toolbar";
import { useTableColumns } from "./TableColumns";
import { DraggableContextRow } from "./TableRow";

export function TableView() {
	const { files, folders, providers, actionContext } = useFileExplorer();
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
		providers,
		onNavigate: actionContext.navigate,
		onShowFileDetails: openForFile,
	});

	// Derive rowSelection directly from SelectionContext — single source of truth
	const rowSelection = useMemo<RowSelectionState>(() => {
		const ids: RowSelectionState = {};
		for (const item of selectedItems) {
			ids[`${item.kind}:${item.data.id}`] = true;
		}
		return ids;
	}, [selectedItems]);

	// Write checkbox changes directly into SelectionContext
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

	const filteredRows = table.getRowModel().rows;

	return (
		<div className="space-y-3">
			<Toolbar table={table} />
			<div>
				<Table className="w-full" style={{ minWidth: 700 }}>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										style={{
											width: header.getSize(),
											minWidth: header.column.columnDef.minSize,
											maxWidth: header.column.columnDef.maxSize,
										}}
										className={
											header.column.id === "select"
												? "w-11 min-w-11 max-w-11 px-2"
												: undefined
										}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{filteredRows.length ? (
							filteredRows.map((row) => (
								<DraggableContextRow key={row.id} row={row} />
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									This folder is empty
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
