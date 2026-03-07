import {
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	type Row,
	type RowSelectionState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useFilesStore } from "@/shared/store/filesStore";
import { FileGridItem } from "./components/FileGridItem";
import { FolderGridItem } from "./components/FolderGridItem";
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
	onCreateDownloadLink,
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
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const viewMode = useFilesStore((state) => state.viewMode);
	const gridContainerRef = useRef<HTMLDivElement | null>(null);
	const gridItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const marqueeStateRef = useRef<{
		pointerId: number;
		additive: boolean;
		baseSelection: RowSelectionState;
		containerRect: DOMRect;
		startX: number;
		startY: number;
	} | null>(null);
	const [marqueeRect, setMarqueeRect] = useState<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);

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
		onCreateDownloadLink,
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

	const filteredRows = table.getRowModel().rows;
	const folderRows = filteredRows.filter(
		(row): row is Row<FolderRow> => row.original.kind === "folder",
	);
	const fileRows = filteredRows.filter(
		(row): row is Row<FileRow> => row.original.kind === "file",
	);

	useEffect(() => {
		if (viewMode !== "grid") {
			setMarqueeRect(null);
			marqueeStateRef.current = null;
		}
	}, [viewMode]);

	useEffect(() => {
		if (viewMode !== "grid") {
			return;
		}

		const handlePointerMove = (event: PointerEvent) => {
			const marquee = marqueeStateRef.current;
			if (!marquee || event.pointerId !== marquee.pointerId) {
				return;
			}

			const currentX = event.clientX;
			const currentY = event.clientY;
			const selectionRect = normalizeRect(
				marquee.startX,
				marquee.startY,
				currentX,
				currentY,
			);

			setMarqueeRect({
				left: selectionRect.left - marquee.containerRect.left,
				top: selectionRect.top - marquee.containerRect.top,
				width: selectionRect.width,
				height: selectionRect.height,
			});

			const nextSelection: RowSelectionState = { ...marquee.baseSelection };
			for (const row of filteredRows) {
				const element = gridItemRefs.current[row.id];
				if (!element) {
					continue;
				}
				const itemRect = element.getBoundingClientRect();
				if (rectsIntersect(selectionRect, itemRect)) {
					nextSelection[row.id] = true;
				}
			}

			setRowSelection(nextSelection);
		};

		const handlePointerUp = (event: PointerEvent) => {
			const marquee = marqueeStateRef.current;
			if (!marquee || event.pointerId !== marquee.pointerId) {
				return;
			}

			marqueeStateRef.current = null;
			setMarqueeRect(null);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};
	}, [filteredRows, viewMode]);

	const handleGridPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}
		if ((event.target as HTMLElement).closest("[data-grid-interactive]")) {
			return;
		}

		const clickedItem = (event.target as HTMLElement).closest(
			"[data-grid-item]",
		);
		if (!clickedItem) {
			setRowSelection({});
		}

		const container = gridContainerRef.current;
		if (!container) {
			return;
		}

		const containerRect = container.getBoundingClientRect();
		const additive = event.metaKey || event.ctrlKey;

		marqueeStateRef.current = {
			pointerId: event.pointerId,
			additive,
			baseSelection: additive ? { ...rowSelection } : {},
			containerRect,
			startX: event.clientX,
			startY: event.clientY,
		};

		setMarqueeRect({
			left: event.clientX - containerRect.left,
			top: event.clientY - containerRect.top,
			width: 0,
			height: 0,
		});
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

			{viewMode === "grid" ? (
				<div
					ref={gridContainerRef}
					className="relative select-none"
					onPointerDown={handleGridPointerDown}
				>
					{marqueeRect ? (
						<div
							className="pointer-events-none absolute z-20 border border-primary bg-primary/10"
							style={{
								left: marqueeRect.left,
								top: marqueeRect.top,
								width: marqueeRect.width,
								height: marqueeRect.height,
							}}
						/>
					) : null}
					<div className="space-y-10">
						{folderRows.length ? (
							<div className="space-y-2">
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
									{folderRows.map((row) => (
										<div key={row.id} className="w-full flex-1">
											<FolderGridItem
												row={row}
												onNavigate={onNavigate}
												registerItemRef={(node) => {
													gridItemRefs.current[row.id] = node;
												}}
												onSelect={(event) => {
													if (
														(event.target as HTMLElement).closest(
															"[data-grid-interactive]",
														)
													) {
														return;
													}

													if (marqueeStateRef.current) {
														return;
													}

													const additive = event.metaKey || event.ctrlKey;
													setRowSelection((current) => {
														const nextSelection = { ...current };
														if (additive) {
															if (row.getIsSelected()) {
																delete nextSelection[row.id];
															} else {
																nextSelection[row.id] = true;
															}
															return nextSelection;
														}

														return { [row.id]: true };
													});
												}}
											/>
										</div>
									))}
								</div>
							</div>
						) : null}
						{fileRows.length ? (
							<div className="space-y-2">
								<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
									{fileRows.map((row) => (
										<FileGridItem
											key={row.id}
											row={row}
											registerItemRef={(node) => {
												gridItemRefs.current[row.id] = node;
											}}
											onSelect={(event) => {
												if (
													(event.target as HTMLElement).closest(
														"[data-grid-interactive]",
													)
												) {
													return;
												}

												if (marqueeStateRef.current) {
													return;
												}

												const additive = event.metaKey || event.ctrlKey;
												setRowSelection((current) => {
													const nextSelection = { ...current };
													if (additive) {
														if (row.getIsSelected()) {
															delete nextSelection[row.id];
														} else {
															nextSelection[row.id] = true;
														}
														return nextSelection;
													}

													return { [row.id]: true };
												});
											}}
										/>
									))}
								</div>
							</div>
						) : null}
					</div>
				</div>
			) : (
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
													: header.column.id === "actions"
														? "w-14 min-w-14 max-w-14 text-right pr-2 sticky right-0 z-20 bg-background"
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
									<DraggableTableRow key={row.id} row={row}>
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
															? "w-14 min-w-14 max-w-14 text-right pr-2 sticky right-0 z-10 bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted"
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
			)}
		</div>
	);
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number) {
	const left = Math.min(x1, x2);
	const top = Math.min(y1, y2);
	const right = Math.max(x1, x2);
	const bottom = Math.max(y1, y2);

	return {
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
	};
}

function rectsIntersect(a: ReturnType<typeof normalizeRect>, b: DOMRect) {
	return !(
		a.right < b.left ||
		a.left > b.right ||
		a.bottom < b.top ||
		a.top > b.bottom
	);
}
