import { PiFolder as FolderIcon } from "react-icons/pi";
import { FileMimeIcon } from "@/features/files/FileMimeIcon";
import type { FileItemFragment } from "@/gql/graphql";
import type { DragItem } from "./types";

interface DragOverlayContentProps {
	item: DragItem;
}

export function DragOverlayContent({ item }: DragOverlayContentProps) {
	return (
		<div className="pointer-events-none flex items-center gap-2 rounded-md bg-background/95 backdrop-blur border border-border/80 px-3 py-1.5 shadow-xl text-sm max-w-60">
			{item.type === "folder" ? (
				<div className="w-5 h-5 shrink-0 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-sm">
					<FolderIcon size={12} />
				</div>
			) : (
				<FileMimeIcon
					mimeType={(item.item as FileItemFragment).mimeType}
					className="h-5 w-5"
					iconSize={12}
				/>
			)}
			<span className="font-medium truncate">{item.name}</span>
		</div>
	);
}
