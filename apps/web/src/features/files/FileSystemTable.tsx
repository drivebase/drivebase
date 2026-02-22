import {
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
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
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import {
	COLUMN_VISIBILITY_STORAGE_KEY,
	DraggableTableRow,
	type FileRow,
	FileSystemTableEmpty,
	FileSystemTableLoading,
	FileSystemTableToolbar,
	type FolderRow,
	type RowItem,
} from "./components/file-system-table";
import { useFileSystemColumns } from "./hooks/useFileSystemColumns";

export type { DragItem, ProviderInfo } from "./components/file-system-table";
// Re-export types and components that are used externally
export { DragOverlayContent } from "./components/file-system-table";

interface FileSystemTableProps {
	files: FileItemFragment[];
	folders?: FolderItemFragment[];
	providers?: { id: string; name: string; type: string }[];
	onNavigate?: (folderId: string) => void;
	onDownloadFile?: (file: FileItemFragment) => void;
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
	isLoading?: boolean;
	showSharedColumn?: boolean;
	emptyStateMessage?: string;
}

export function FileSystemTable({
	files,
	folders = [],
	providers = [],
	onNavigate,
	onDownloadFile,
	onShowFileDetails,
	onToggleFileFavorite,
	onToggleFolderFavorite,
	onRenameFile,
	onRenameFolder,
	onMoveFileToProvider,
	onDeleteSelection,
	isLoading,
	showSharedColumn = false,
	emptyStateMessage = "This folder is empty",
}: FileSystemTableProps) {
	const [rowSelection, setRowSelection] = useState({});

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => {
			if (typeof window !== "undefined") {
				try {
					const stored = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
					if (stored) {
						return JSON.parse(stored);
					}
				} catch (e) {
					console.error("Failed to load column visibility", e);
				}
			}
			return { shared: showSharedColumn };
		},
	);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [isDeletingSelection, setIsDeletingSelection] = useState(false);

	useEffect(() => {
		try {
			localStorage.setItem(
				COLUMN_VISIBILITY_STORAGE_KEY,
				JSON.stringify(columnVisibility),
			);
		} catch (e) {
			console.error("Failed to save column visibility", e);
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

	const columns = useFileSystemColumns({
		providers,
		onNavigate,
		onDownloadFile,
		onShowFileDetails,
		onToggleFileFavorite,
		onToggleFolderFavorite,
		onRenameFile,
		onRenameFolder,
		onMoveFileToProvider,
		onDeleteSelection,
	});

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onRowSelectionChange: setRowSelection,
		onColumnVisibilityChange: setColumnVisibility,
		onColumnFiltersChange: setColumnFilters,
		state: {
			rowSelection,
			columnVisibility,
			columnFilters,
		},
		columnResizeMode: "onChange",
		defaultColumn: {
			size: 140,
			minSize: 90,
		},
	});

	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const selectedCount = selectedRows.length;
	const selectedFiles = selectedRows
		.map((row) => row.original)
		.filter((row): row is FileRow => row.kind === "file")
		.map((row) => row.file);
	const selectedFolders = selectedRows
		.map((row) => row.original)
		.filter((row): row is FolderRow => row.kind === "folder")
		.map((row) => row.folder);

	const handleDeleteSelection = async (selection?: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => {
		if (!onDeleteSelection) return;
		const target = selection ?? {
			files: selectedFiles,
			folders: selectedFolders,
		};
		if (target.files.length === 0 && target.folders.length === 0) return;
		const confirmed = await confirmDialog(
			"Delete Selected Items",
			`Delete ${target.files.length + target.folders.length} selected item(s)? This action cannot be undone.`,
		);
		if (!confirmed) return;
		try {
			setIsDeletingSelection(true);
			await onDeleteSelection(target);
			table.resetRowSelection();
		} finally {
			setIsDeletingSelection(false);
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				<FileSystemTableToolbar
					table={table}
					selectedCount={0}
					isLoading={true}
				/>
				<div>
					<FileSystemTableLoading showSharedColumn={showSharedColumn} />
				</div>
			</div>
		);
	}

	if (data.length === 0) {
		return <FileSystemTableEmpty message={emptyStateMessage} />;
	}

	return (
		<div className="space-y-3">
			<FileSystemTableToolbar
				table={table}
				selectedCount={selectedCount}
				isDeleting={isDeletingSelection}
				onDeleteSelection={
					onDeleteSelection && selectedCount > 0
						? () => handleDeleteSelection()
						: undefined
				}
			/>

			<div>
				<Table className="w-full" style={{ minWidth: 700 }}>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										style={
											header.column.id === "name"
												? { minWidth: header.column.columnDef.minSize }
												: {
														width: header.getSize(),
														minWidth: header.column.columnDef.minSize,
														maxWidth: header.column.columnDef.maxSize,
													}
										}
										className={
											header.column.id === "select"
												? "w-11 min-w-11 max-w-11 px-2"
												: header.column.id === "actions"
													? "w-14 min-w-14 max-w-14 text-right pr-2 sticky right-0 z-20 bg-background"
													: header.column.id === "name"
														? "w-full min-w-50"
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
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<DraggableTableRow key={row.id} row={row}>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											style={
												cell.column.id === "name"
													? { minWidth: cell.column.columnDef.minSize }
													: {
															width: cell.column.getSize(),
															minWidth: cell.column.columnDef.minSize,
															maxWidth: cell.column.columnDef.maxSize,
														}
											}
											className={
												cell.column.id === "select"
													? "w-11 min-w-11 max-w-11 px-2"
													: cell.column.id === "actions"
														? "w-14 min-w-14 max-w-14 text-right pr-2 sticky right-0 z-10 bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted"
														: cell.column.id === "name"
															? "w-full min-w-50"
															: undefined
											}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</DraggableTableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									{emptyStateMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
