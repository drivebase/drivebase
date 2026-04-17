import { Folder, FolderDown } from "lucide-react";
import type { FolderItem } from "./types";

interface FolderCardProps {
	folder: FolderItem;
	onClick?: () => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex flex-col justify-between p-4 rounded-xl border border-border/50 bg-surface-secondary/30 hover:bg-surface-secondary/60 transition-colors min-w-[200px] min-h-[120px] text-left"
		>
			<div className="flex items-start justify-between">
				<div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
					{folder.badge ? (
						<Folder size={18} className="text-accent" />
					) : (
						<FolderDown size={18} className="text-muted" />
					)}
				</div>
				{folder.badge && (
					<span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-semibold tracking-wide uppercase">
						{folder.badge}
					</span>
				)}
			</div>
			<div className="mt-3">
				<p className="text-sm font-medium text-foreground truncate">
					{folder.name}
				</p>
				<p className="text-xs text-muted mt-0.5">{folder.meta}</p>
			</div>
		</button>
	);
}
