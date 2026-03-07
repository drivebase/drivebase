import { PiStarFill as StarIcon } from "react-icons/pi";
import type { FileItemFragment } from "@/gql/graphql";
import { cn } from "@/shared/lib/utils";
import { FileMimeIcon } from "../../FileMimeIcon";
import { FileContextMenu } from "../ContextMenu";
import { useSelection } from "../../context/SelectionContext";

interface GridFileItemProps {
	file: FileItemFragment;
	registerRef?: (node: HTMLDivElement | null) => void;
}

export function GridFileItem({ file, registerRef }: GridFileItemProps) {
	const { isSelected, selectOnly, toggle } = useSelection();
	const itemId = `file:${file.id}`;
	const selected = isSelected(itemId);
	const selectionItem = { kind: "file" as const, data: file };

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
				className={cn(
					"group relative select-none border border-border/60 bg-background/40 backdrop-blur-lg p-3 transition-colors hover:bg-background/10",
					selected && "border-primary/50 bg-background/40 backdrop-blur-md",
				)}
			>
				<div className="flex items-center gap-3 pr-10">
					<FileMimeIcon
						mimeType={file.mimeType}
						className="h-8 w-8 shrink-0 rounded-none"
						iconSize={18}
					/>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1">
							<span className="truncate text-base font-medium">
								{file.name}
							</span>
							{file.starred ? (
								<StarIcon size={12} className="shrink-0 text-amber-500" />
							) : null}
						</div>
					</div>
				</div>
				<div className="mt-3 aspect-square w-full bg-background/20 backdrop-blur-md">
					<div className="flex h-full items-center justify-center">
						<FileMimeIcon
							mimeType={file.mimeType}
							className="h-28 w-28 rounded-none"
							iconSize={52}
						/>
					</div>
				</div>
			</div>
		</FileContextMenu>
	);
}
