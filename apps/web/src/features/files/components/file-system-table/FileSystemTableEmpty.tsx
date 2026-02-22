import { FolderIcon } from "lucide-react";

interface FileSystemTableEmptyProps {
	message?: string;
}

export function FileSystemTableEmpty({
	message = "This folder is empty",
}: FileSystemTableEmptyProps) {
	return (
		<div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
			<div className="p-4  bg-muted/50 mb-4">
				<FolderIcon size={32} className="opacity-50" />
			</div>
			<p className="font-medium">{message}</p>
		</div>
	);
}
