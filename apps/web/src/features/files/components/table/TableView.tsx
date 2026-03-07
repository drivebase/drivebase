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
import { useTableColumns } from "./TableColumns";
import { DraggableContextRow } from "./TableRow";
import { Toolbar } from "../Toolbar";

export function TableView() {
	const { files, folders, providers, actionContext } = useFileExplorer();
	const { selectedItems } = useSelection();
	const openForFile = useFileDetailsDialogStore((s) => s.openForFile);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
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

	// Sync selection context → table row selection
	useEffect(() => {
		const ids: RowSelectionState = {};
		for (const item of selectedItems) {
			ids[`${item.kind}:${item.data.id}`] = true;
		}
		setRowSelection(ids);
	}, [selectedItems]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onRowSelectionChange: setRowSelection,
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
