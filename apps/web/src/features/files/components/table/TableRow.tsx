import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { TableCell, TableRow as UITableRow } from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import type { SelectionItem } from "../../actions/types";
import { FileContextMenu } from "../ContextMenu";
import type { DragItem, RowItem } from "../file-system-table/types";
import { useClipboardStore } from "../../store/clipboardStore";

interface DraggableTableRowProps {
	row: Row<RowItem>;
}

function rowToSelectionItem(row: Row<RowItem>): SelectionItem {
	const o = row.original;
	return o.kind === "file"
		? { kind: "file", data: o.file }
		: { kind: "folder", data: o.folder };
}

function rowToDragItem(row: Row<RowItem>): DragItem {
	const o = row.original;
	return o.kind === "file"
		? { type: "file", id: o.file.id, name: o.file.name, item: o.file }
		: { type: "folder", id: o.folder.id, name: o.folder.name, item: o.folder };
}

export function DraggableContextRow({ row }: DraggableTableRowProps) {
	const original = row.original;
	const dragData = rowToDragItem(row);
	const selectionItem = rowToSelectionItem(row);
	const isClipboardDimmed = useClipboardStore((s) => s.isDimmed(original.id));

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({ id: original.id, data: dragData });

	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: original.id,
		disabled: original.kind !== "folder",
		data:
			original.kind === "folder"
				? {
						kind: "folder",
						folderId: original.folder.id,
						providerId: original.folder.providerId,
					}
				: undefined,
	});

	const setRef = (el: HTMLTableRowElement | null) => {
		setDragRef(el);
		setDropRef(el);
	};

	return (
		<FileContextMenu item={selectionItem}>
			<UITableRow
				ref={setRef}
				data-item-id={original.id}
				data-state={row.getIsSelected() && "selected"}
				className={cn(
					"group relative",
					isDragging && "opacity-20",
					isClipboardDimmed && "opacity-60",
					isOver &&
						original.kind === "folder" &&
						"ring-2 ring-primary ring-inset bg-primary/5",
				)}
				{...attributes}
				{...listeners}
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
								: undefined
						}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCell>
				))}
			</UITableRow>
		</FileContextMenu>
	);
}
