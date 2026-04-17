import type { FileItem } from "./types";
import { FileIcon } from "./FileIcon";

interface FileGridItemProps {
	file: FileItem;
	onClick?: () => void;
}

export function FileGridItem({ file, onClick }: FileGridItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors text-center"
		>
			<FileIcon type={file.icon} size="lg" />
			<span className="text-xs text-foreground truncate w-full">{file.name}</span>
		</button>
	);
}
