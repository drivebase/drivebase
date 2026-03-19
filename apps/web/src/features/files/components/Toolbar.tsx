import type { Table } from "@tanstack/react-table";
import {
	PiCopy as Copy,
	PiClipboardText as Paste,
	PiColumns as Columns,
	PiSquaresFour as GridView,
	PiListBullets as TableViewIcon,
	PiScissors as Cut,
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
import { useFileExplorer } from "../context/FileExplorerProvider";
import { useSelection } from "../context/SelectionContext";
import { useClipboardStore } from "../store/clipboardStore";
import type { RowItem } from "./file-system-table/types";

interface ToolbarProps {
	table?: Table<RowItem>;
}

export function Toolbar({ table }: ToolbarProps) {
	const { isLoading, registry, actionContext, canWrite, files, folders } =
		useFileExplorer();
	const { count, selectedItems } = useSelection();
	const viewMode = useFilesStore((s) => s.viewMode);
	const setViewMode = useFilesStore((s) => s.setViewMode);

	const clipboardCount = useClipboardStore((s) => s.items.length);
	const hasSelection = count > 0;
	const canCut = canWrite && hasSelection;
	const canCopy = canWrite && hasSelection;
	const canDelete = canWrite && count > 0;
	const canPaste = canWrite && clipboardCount > 0;

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

	const total = files.length + folders.length;

	return (
		<div className="sticky top-0 z-30 flex items-center justify-between">
			<div className="text-xs text-muted-foreground">
				{count} of {total} selected
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
						<TableViewIcon
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
				{canPaste ? (
					<Button
						variant="outline"
						onClick={() => {
							const pasteAction = registry.getById("paste-selection");
							if (!pasteAction) return;
							pasteAction.execute({
								...actionContext,
								selection: selectedItems,
							});
						}}
					>
						<Paste size={14} className="mr-2" />
						Paste ({clipboardCount})
					</Button>
				) : null}
				{canCopy ? (
					<Button
						variant="outline"
						onClick={() => {
							const copyAction = registry.getById("copy-selection");
							if (!copyAction) return;
							copyAction.execute({
								...actionContext,
								selection: selectedItems,
							});
						}}
					>
						<Copy size={14} className="mr-2" />
						Copy ({count})
					</Button>
				) : null}
				{canCut ? (
					<Button
						variant="outline"
						onClick={() => {
							const cutAction = registry.getById("cut-selection");
							if (!cutAction) return;
							cutAction.execute({
								...actionContext,
								selection: selectedItems,
							});
						}}
					>
						<Cut size={14} className="mr-2" />
						Cut ({count})
					</Button>
				) : null}
				{canDelete ? (
					<Button
						variant="destructive"
						onClick={() => {
							const deleteAction = registry.getById("delete");
							if (!deleteAction) return;
							deleteAction.execute({
								...actionContext,
								selection: selectedItems,
							});
						}}
					>
						<Trash size={14} className="mr-2" />
						Delete ({count})
					</Button>
				) : null}
				{table ? (
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
				) : null}
			</div>
		</div>
	);
}
