import { FolderIcon } from "lucide-react";
import { FileMimeIcon } from "@/features/files/FileMimeIcon";
import type { FileItemFragment } from "@/gql/graphql";
import type { DragItem } from "./types";

interface DragOverlayContentProps {
	item: DragItem;
}

export function DragOverlayContent({ item }: DragOverlayContentProps) {
	return (
		<div className="flex items-center gap-3 bg-background border rounded-lg px-4 py-2 shadow-lg text-sm">
			{item.type === "folder" ? (
				<div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
					<FolderIcon size={14} />
				</div>
			) : (
				<FileMimeIcon mimeType={(item.item as FileItemFragment).mimeType} />
			)}
			<span className="font-medium">{item.name}</span>
		</div>
	);
}
