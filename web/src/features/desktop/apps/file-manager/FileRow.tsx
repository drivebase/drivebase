import type { FileItem } from "./types";
import { FileIcon } from "./FileIcon";

interface FileRowProps {
	file: FileItem;
	onClick?: () => void;
}

export function FileRow({ file, onClick }: FileRowProps) {
	return (
		<div
			data-context-type="file"
			data-context-data={JSON.stringify({ id: file.name, name: file.name, kind: file.kind })}
			role="button"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={(e) => e.key === "Enter" && onClick?.()}
			className="grid grid-cols-[1fr_100px_120px_130px] items-center gap-4 px-5 py-2.5 hover:bg-muted/50 transition-colors w-full text-left cursor-default"
		>
			<div className="flex items-center gap-3 min-w-0">
				<FileIcon type={file.icon} />
				<div className="min-w-0">
					<p className="text-sm text-foreground truncate">{file.name}</p>
					{file.subtitle && (
						<p className="text-xs text-muted-foreground truncate">{file.subtitle}</p>
					)}
				</div>
			</div>
			<span className="text-xs text-muted-foreground">{file.size}</span>
			<span className="text-xs text-muted-foreground">{file.kind}</span>
			<span className="text-xs text-muted-foreground text-right">{file.modified}</span>
		</div>
	);
}
