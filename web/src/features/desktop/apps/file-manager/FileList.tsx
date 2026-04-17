import type { FileItem } from "./types";
import { FileRow } from "./FileRow";
import { FileGridItem } from "./FileGridItem";

interface FileListProps {
	files: FileItem[];
	view: "list" | "grid";
}

export function FileList({ files, view }: FileListProps) {
	if (view === "grid") {
		return (
			<div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 px-5 pb-5">
				{files.map((file) => (
					<FileGridItem key={file.id} file={file} />
				))}
			</div>
		);
	}

	return (
		<div>
			<div className="grid grid-cols-[1fr_100px_120px_130px] gap-4 px-5 py-2 border-b border-border">
				<span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Name</span>
				<span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Size</span>
				<span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Kind</span>
				<span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase text-right">Modified</span>
			</div>
			<div className="divide-y divide-border">
				{files.map((file) => (
					<FileRow key={file.id} file={file} />
				))}
			</div>
		</div>
	);
}
