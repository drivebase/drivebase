import type { Table } from "@tanstack/react-table";
import { Columns, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
	if (isLoading) {
		return (
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-24" />
				<Button variant="outline" size="sm" disabled>
					<Columns />
				</Button>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between">
			<div className="text-xs text-muted-foreground">
				{selectedCount} of {table.getFilteredRowModel().rows.length} selected
			</div>
			<div className="flex items-center gap-2">
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
