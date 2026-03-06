import type { Table } from "@tanstack/react-table";
import {
	PiColumns as Columns,
	PiSquaresFour as GridView,
	PiListBullets as TableView,
	PiTrash as Trash,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilesStore } from "@/shared/store/filesStore";
import type { RowItem } from "./types";

interface FileSystemTableToolbarProps {
	table: Table<RowItem>;
	selectedCount: number;
	isDeleting?: boolean;
	onDeleteSelection?: () => void;
	isLoading?: boolean;
}

export function FileSystemTableToolbar({
	table,
	selectedCount,
	isDeleting = false,
	onDeleteSelection,
	isLoading = false,
}: FileSystemTableToolbarProps) {
	const viewMode = useFilesStore((state) => state.viewMode);
	const setViewMode = useFilesStore((state) => state.setViewMode);

	if (isLoading) {
		return (
			<div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
				<Skeleton className="h-4 w-24" />
				<Button variant="outline" size="sm" disabled>
					<Columns />
				</Button>
			</div>
		);
	}

	return (
		<div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
			<div className="text-xs text-muted-foreground">
				{selectedCount} of {table.getFilteredRowModel().rows.length} selected
			</div>
			<div className="flex items-center gap-2">
				<div className="flex items-center border bg-background p-0.5">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						aria-label="Table view"
						aria-pressed={viewMode === "table"}
						onClick={() => setViewMode("table")}
					>
						<TableView
							className={
								viewMode === "table"
									? "text-foreground"
									: "text-muted-foreground"
							}
						/>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						aria-label="Grid view"
						aria-pressed={viewMode === "grid"}
						onClick={() => setViewMode("grid")}
					>
						<GridView
							className={
								viewMode === "grid"
									? "text-foreground"
									: "text-muted-foreground"
							}
						/>
					</Button>
				</div>
				{onDeleteSelection && selectedCount > 0 ? (
					<Button
						variant="destructive"
						onClick={onDeleteSelection}
						disabled={isDeleting}
					>
						<Trash size={14} className="mr-2" />
						{isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
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
	);
}
