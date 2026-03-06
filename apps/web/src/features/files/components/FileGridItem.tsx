import { flexRender, type Row } from "@tanstack/react-table";
import type * as React from "react";
import { PiStarFill as StarIcon } from "react-icons/pi";
import { cn } from "@/shared/lib/utils";
import { FileMimeIcon } from "../FileMimeIcon";
import type { FileRow } from "./file-system-table";

interface FileGridItemProps {
	row: Row<FileRow>;
	registerItemRef?: (node: HTMLDivElement | null) => void;
	onSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function FileGridItem({
	row,
	registerItemRef,
	onSelect,
}: FileGridItemProps) {
	const actionsCell = row
		.getVisibleCells()
		.find((cell) => cell.column.id === "actions");

	return (
		<div
			ref={registerItemRef}
			data-grid-item
			data-state={row.getIsSelected() ? "selected" : undefined}
			onClick={onSelect}
			className={cn(
				"group relative select-none border border-border/60 bg-background/40 backdrop-blur-lg p-3 transition-colors hover:bg-background/10",
				row.getIsSelected() &&
					"border-primary/50 bg-background/40 backdrop-blur-md",
			)}
		>
			<div className="absolute right-3 top-3 z-10" data-grid-interactive>
				{actionsCell
					? flexRender(
							actionsCell.column.columnDef.cell,
							actionsCell.getContext(),
						)
					: null}
			</div>
			<div className="flex items-center gap-3 pr-10">
				<FileMimeIcon
					mimeType={row.original.file.mimeType}
					className="h-8 w-8 shrink-0 rounded-none"
					iconSize={18}
				/>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1">
						<span className="truncate text-base font-medium">
							{row.original.file.name}
						</span>
						{row.original.file.starred ? (
							<StarIcon size={12} className="shrink-0 text-amber-500" />
						) : null}
					</div>
				</div>
			</div>
			<div className="mt-3 aspect-square w-full bg-background/20 backdrop-blur-md">
				<div className="flex h-full items-center justify-center">
					<FileMimeIcon
						mimeType={row.original.file.mimeType}
						className="h-28 w-28 rounded-none"
						iconSize={52}
					/>
				</div>
			</div>
		</div>
	);
}
