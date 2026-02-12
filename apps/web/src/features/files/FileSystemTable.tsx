import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
	Columns,
	Copy,
	Download,
	Eye,
	FolderIcon,
	Info,
	MoreHorizontal,
	Move,
	Pencil,
	Share2,
	Star,
	Trash,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { FileMimeIcon } from "@/features/files/FileMimeIcon";
import {
	formatFileTypeLabel,
	formatProviderTypeLabel,
	formatSize,
} from "@/features/files/utils";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import { confirmDialog } from "@/lib/confirmDialog";

type FileRow = { kind: "file"; id: string; file: FileItemFragment };
type FolderRow = { kind: "folder"; id: string; folder: FolderItemFragment };
type RowItem = FileRow | FolderRow;

interface FileSystemTableProps {
	files: FileItemFragment[];
	folders?: FolderItemFragment[];
	onNavigate?: (folderId: string) => void;
	onDownloadFile?: (file: FileItemFragment) => void;
	onShowFileDetails?: (file: FileItemFragment) => void;
	onToggleFileFavorite?: (file: FileItemFragment) => void;
	onToggleFolderFavorite?: (folder: FolderItemFragment) => void;
	onDeleteSelection?: (selection: {
		files: FileItemFragment[];
		folders: FolderItemFragment[];
	}) => Promise<void> | void;
	isLoading?: boolean;
	showSharedColumn?: boolean;
	emptyStateMessage?: string;
}

function LoadingTable({ showSharedColumn }: { showSharedColumn: boolean }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-10" />
					<TableHead className="w-[360px]">Name</TableHead>
					<TableHead>Size</TableHead>
					<TableHead>Provider</TableHead>
					<TableHead>Type</TableHead>
					{showSharedColumn ? <TableHead>Shared</TableHead> : null}
					<TableHead className="text-right">Last Modified</TableHead>
					<TableHead className="w-[50px]" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 6 }).map((_, i) => (
					<TableRow
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading
						key={i}
					>
						<TableCell>
							<Skeleton className="h-4 w-4" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-56" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-16" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-24" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-20" />
						</TableCell>
						{showSharedColumn ? (
							<TableCell>
								<Skeleton className="h-4 w-16" />
							</TableCell>
						) : null}
						<TableCell className="text-right">
							<Skeleton className="h-4 w-24 ml-auto" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-8 w-8 rounded-md ml-auto" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export function FileSystemTable({
	files,
	folders = [],
	onNavigate,
	onDownloadFile,
	onShowFileDetails,
	onToggleFileFavorite,
	onToggleFolderFavorite,
	onDeleteSelection,
	isLoading,
	showSharedColumn = false,
	emptyStateMessage = "This folder is empty",
}: FileSystemTableProps) {
	const [rowSelection, setRowSelection] = useState({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
		shared: showSharedColumn,
	});
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [isDeletingSelection, setIsDeletingSelection] = useState(false);

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

	const columns = useMemo<ColumnDef<RowItem>[]>(
		() => [
			{
				id: "select",
				enableHiding: false,
				size: 44,
				minSize: 44,
				maxSize: 44,
				header: ({ table }) => (
					<div className="w-4 h-4 flex items-center justify-center">
						<Checkbox
							aria-label="Select all"
							className="w-4 h-4 min-w-4 min-h-4 shrink-0"
							checked={
								table.getIsAllPageRowsSelected()
									? true
									: table.getIsSomePageRowsSelected()
										? "indeterminate"
										: false
							}
							onCheckedChange={(value) =>
								table.toggleAllPageRowsSelected(value === true)
							}
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className="w-4 h-4 flex items-center justify-center">
						<Checkbox
							aria-label="Select row"
							className="w-4 h-4 min-w-4 min-h-4 shrink-0"
							checked={row.getIsSelected()}
							onCheckedChange={(value) => row.toggleSelected(value === true)}
						/>
					</div>
				),
			},
			{
				id: "name",
				size: 360,
				minSize: 260,
				accessorFn: (row) =>
					row.kind === "file" ? row.file.name : row.folder.name,
				header: "Name",
				cell: ({ row }) => {
					if (row.original.kind === "folder") {
						const folder = row.original.folder;
						return (
							<button
								type="button"
								onClick={() => onNavigate?.(folder.id)}
								className="font-medium flex items-center gap-3 text-left hover:underline"
							>
								<div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
									<FolderIcon size={16} />
								</div>
								<span>{folder.name}</span>
							</button>
						);
					}

					const file = row.original.file;
					return (
						<div className="font-medium flex items-center gap-3">
							<FileMimeIcon mimeType={file.mimeType} />
							<span>{file.name}</span>
						</div>
					);
				},
			},
			{
				id: "size",
				size: 120,
				minSize: 100,
				header: "Size",
				accessorFn: (row) => (row.kind === "file" ? row.file.size : null),
				cell: ({ row }) =>
					row.original.kind === "file"
						? formatSize(row.original.file.size)
						: "-",
			},
			{
				id: "provider",
				size: 150,
				minSize: 120,
				header: "Provider",
				accessorFn: (row) =>
					row.kind === "file"
						? (row.file.provider?.type ?? "Unknown")
						: "Folder",
				cell: ({ row }) => {
					if (row.original.kind === "folder") return "-";
					const file = row.original.file;
					return (
						<div className="flex items-center gap-2">
							<ProviderIcon
								type={file.provider?.type ?? "unknown"}
								className="h-4 w-4"
							/>
							<span className="text-sm text-muted-foreground">
								{formatProviderTypeLabel(file.provider?.type)}
							</span>
						</div>
					);
				},
			},
			{
				id: "type",
				size: 60,
				minSize: 60,
				header: "Type",
				accessorFn: (row) =>
					row.kind === "file" ? row.file.mimeType : "folder",
				cell: ({ row }) =>
					row.original.kind === "file"
						? formatFileTypeLabel(row.original.file.mimeType)
						: "Folder",
			},
			{
				id: "shared",
				size: 120,
				minSize: 100,
				header: "Shared",
				enableHiding: true,
				cell: () => (
					<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
						Private
					</span>
				),
			},
			{
				id: "updatedAt",
				size: 170,
				minSize: 150,
				header: () => <div className="text-right">Last Modified</div>,
				accessorFn: (row) =>
					row.kind === "file" ? row.file.updatedAt : row.folder.updatedAt,
				cell: ({ row }) => {
					const date =
						row.original.kind === "file"
							? row.original.file.updatedAt
							: row.original.folder.updatedAt;
					return (
						<div className="text-right text-muted-foreground">
							{format(new Date(date), "MMM dd, yyyy")}
						</div>
					);
				},
			},
			{
				id: "actions",
				enableHiding: false,
				size: 56,
				minSize: 56,
				maxSize: 56,
				header: () => <div className="text-right" />,
				cell: ({ row }) => {
					const original = row.original;
					const file = original.kind === "file" ? original.file : undefined;
					const folder =
						original.kind === "folder" ? original.folder : undefined;

					return (
						<div className="flex justify-end">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" className="h-8 w-8 p-0">
										<span className="sr-only">Open menu</span>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-48">
									<DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
									<DropdownMenuItem
										onClick={() => file && onDownloadFile?.(file)}
									>
										<Download size={14} className="mr-2" /> Download
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Eye size={14} className="mr-2" /> Preview
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuLabel>Organize</DropdownMenuLabel>
									<DropdownMenuItem>
										<Pencil size={14} className="mr-2" /> Rename
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Move size={14} className="mr-2" /> Move
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Copy size={14} className="mr-2" /> Make a copy
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuLabel>Library</DropdownMenuLabel>
									<DropdownMenuItem>
										<Share2 size={14} className="mr-2" /> Share
									</DropdownMenuItem>
									{file ? (
										<DropdownMenuItem
											onClick={() => onToggleFileFavorite?.(file)}
										>
											<Star size={14} className="mr-2" />
											{file.starred
												? "Remove from Favorites"
												: "Add to Favorites"}
										</DropdownMenuItem>
									) : null}
									{folder ? (
										<DropdownMenuItem
											onClick={() => onToggleFolderFavorite?.(folder)}
										>
											<Star size={14} className="mr-2" />
											{folder.starred
												? "Remove from Favorites"
												: "Add to Favorites"}
										</DropdownMenuItem>
									) : null}
									<DropdownMenuItem
										onClick={() => file && onShowFileDetails?.(file)}
									>
										<Info size={14} className="mr-2" /> Details
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										variant="destructive"
										onClick={async () => {
											const confirmed = await confirmDialog(
												"Delete Item",
												"This action cannot be undone.",
											);
											if (!confirmed) return;
											onDeleteSelection?.({
												files: file ? [file] : [],
												folders: folder ? [folder] : [],
											});
										}}
									>
										<Trash size={14} className="mr-2" /> Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				},
			},
		],
		[
			onDeleteSelection,
			onDownloadFile,
			onNavigate,
			onShowFileDetails,
			onToggleFileFavorite,
			onToggleFolderFavorite,
		],
	);

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
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-24" />
					<Button variant="outline" size="sm" disabled>
						<Columns />
					</Button>
				</div>
				<div>
					<LoadingTable showSharedColumn={showSharedColumn} />
				</div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
				<div className="p-4 rounded-full bg-muted/50 mb-4">
					<FolderIcon size={32} className="opacity-50" />
				</div>
				<p className="font-medium">{emptyStateMessage}</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div className="text-xs text-muted-foreground">
					{selectedCount} of {table.getFilteredRowModel().rows.length} selected
				</div>
				<div className="flex items-center gap-2">
					{onDeleteSelection && selectedCount > 0 ? (
						<Button
							variant="destructive"
							onClick={() => handleDeleteSelection()}
							disabled={isDeletingSelection}
						>
							<Trash size={14} className="mr-2" />
							{isDeletingSelection
								? "Deleting..."
								: `Delete (${selectedCount})`}
						</Button>
					) : null}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon">
								<Columns />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-44">
							{table
								.getAllColumns()
								.filter((column) => column.getCanHide())
								.map((column) => (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) =>
											column.toggleVisibility(Boolean(value))
										}
									>
										{column.id}
									</DropdownMenuCheckboxItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div>
				<Table className="w-full table-fixed">
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
												: header.column.id === "actions"
													? "w-14 min-w-14 max-w-14 text-right pr-2"
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
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											style={{
												width: cell.column.getSize(),
												minWidth: cell.column.columnDef.minSize,
												maxWidth: cell.column.columnDef.maxSize,
											}}
											className={
												cell.column.id === "select"
													? "w-11 min-w-11 max-w-11 px-2"
													: cell.column.id === "actions"
														? "w-14 min-w-14 max-w-14 text-right pr-2"
														: undefined
											}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
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
