import { PiFolder as FolderIcon, PiStarFill as StarIcon } from "react-icons/pi";
import type { FolderItemFragment } from "@/gql/graphql";
import { cn } from "@/shared/lib/utils";
import { FileContextMenu } from "../ContextMenu";
import { useSelection } from "../../context/SelectionContext";
import { useFileExplorer } from "../../context/FileExplorerProvider";

interface GridFolderItemProps {
	folder: FolderItemFragment;
	registerRef?: (node: HTMLDivElement | null) => void;
}

export function GridFolderItem({ folder, registerRef }: GridFolderItemProps) {
	const { isSelected, selectOnly, toggle } = useSelection();
	const { actionContext } = useFileExplorer();
	const itemId = `folder:${folder.id}`;
	const selected = isSelected(itemId);
	const selectionItem = { kind: "folder" as const, data: folder };

	const handleClick = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest("[data-grid-interactive]")) return;
		const additive = e.metaKey || e.ctrlKey;
		if (additive) {
			toggle(selectionItem);
		} else {
			selectOnly(selectionItem);
		}
	};

	return (
		<FileContextMenu item={selectionItem}>
			<div
				ref={registerRef}
				data-grid-item
				data-state={selected ? "selected" : undefined}
				onClick={handleClick}
				onDoubleClick={() => actionContext.navigate(folder.id)}
				className={cn(
					"w-full group relative cursor-pointer select-none border border-border/60 bg-background/40 backdrop-blur-lg p-3 transition-colors hover:bg-background/10",
					selected && "border-primary/50 bg-muted/70",
				)}
			>
				<div className="flex items-center gap-4">
					<div className="text-foreground/80">
						<FolderIcon size={22} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1">
							<span className="truncate font-medium">{folder.name}</span>
							{folder.starred ? (
								<StarIcon size={12} className="shrink-0 text-amber-500" />
							) : null}
						</div>
					</div>
				</div>
			</div>
		</FileContextMenu>
	);
}
