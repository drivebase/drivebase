import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Row } from "@tanstack/react-table";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import type { DragItem, RowItem } from "./types";

interface DraggableTableRowProps {
	row: Row<RowItem>;
	children: React.ReactNode;
}

export function DraggableTableRow({ row, children }: DraggableTableRowProps) {
	const original = row.original;
	const dragData: DragItem =
		original.kind === "file"
			? {
					type: "file",
					id: original.file.id,
					name: original.file.name,
					item: original.file,
				}
			: {
					type: "folder",
					id: original.folder.id,
					name: original.folder.name,
					item: original.folder,
				};

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({
		id: original.id,
		data: dragData,
	});

	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: original.id,
		disabled: original.kind !== "folder",
	});

	const setRef = (el: HTMLTableRowElement | null) => {
		setDragRef(el);
		setDropRef(el);
	};

	return (
		<TableRow
			ref={setRef}
			data-state={row.getIsSelected() && "selected"}
			className={cn(
				"group relative",
				isDragging && "opacity-40",
				isOver &&
					original.kind === "folder" &&
					"ring-2 ring-primary ring-inset bg-primary/5",
			)}
			{...attributes}
			{...listeners}
		>
			{children}
		</TableRow>
	);
}
