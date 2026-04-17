import type { FileItem } from "./types";
import { FileIcon } from "./FileIcon";

interface FileGridItemProps {
	file: FileItem;
	onClick?: () => void;
}

export function FileGridItem({ file, onClick }: FileGridItemProps) {
	return (
		<div
			data-context-type="file"
			data-context-data={JSON.stringify({ id: file.name, name: file.name, kind: file.kind })}
			role="button"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick?.()}
			className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors text-center cursor-default"
		>
			<FileIcon type={file.icon} size="lg" />
			<span className="text-xs text-foreground truncate w-full">{file.name}</span>
		</div>
	);
}
