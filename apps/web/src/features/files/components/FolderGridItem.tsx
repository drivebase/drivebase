import { flexRender, type Row } from "@tanstack/react-table";
import type * as React from "react";
import { PiFolder as FolderIcon, PiStarFill as StarIcon } from "react-icons/pi";
import { cn } from "@/shared/lib/utils";
import type { FolderRow } from "./file-system-table";

interface FolderGridItemProps {
	row: Row<FolderRow>;
	registerItemRef?: (node: HTMLDivElement | null) => void;
	onSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
	onNavigate?: (folderId: string) => void;
}

export function FolderGridItem({
	row,
	registerItemRef,
	onSelect,
	onNavigate,
}: FolderGridItemProps) {
	const actionsCell = row
		.getVisibleCells()
		.find((cell) => cell.column.id === "actions");

	return (
		<div
			ref={registerItemRef}
			data-grid-item
			data-state={row.getIsSelected() ? "selected" : undefined}
			onClick={onSelect}
			onDoubleClick={() => onNavigate?.(row.original.folder.id)}
			className={cn(
				"w-full group relative cursor-pointer select-none border border-border/60 bg-muted/40 p-3 transition-colors hover:bg-muted/60",
				row.getIsSelected() && "border-primary/50 bg-muted/70",
			)}
		>
			<div className="flex items-center gap-4">
				<div className="text-foreground/80">
					<FolderIcon size={22} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1">
						<span className="truncate font-medium">
							{row.original.folder.name}
						</span>
						{row.original.folder.starred ? (
							<StarIcon size={12} className="shrink-0 text-amber-500" />
						) : null}
					</div>
				</div>
				<div data-grid-interactive>
					{actionsCell
						? flexRender(
								actionsCell.column.columnDef.cell,
								actionsCell.getContext(),
							)
						: null}
				</div>
			</div>
		</div>
	);
}
