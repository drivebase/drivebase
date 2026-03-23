import { PiFolder as FolderIcon } from "react-icons/pi";

interface FileSystemTableEmptyProps {
	message?: string;
}

export function FileSystemTableEmpty({
	message = "This folder is empty",
}: FileSystemTableEmptyProps) {
	return (
		<div className="flex h-full min-h-96 w-full flex-col items-center justify-center text-muted-foreground">
			<div className="p-4  bg-muted/50 mb-4">
				<FolderIcon size={32} className="opacity-50" />
			</div>
			<p className="font-medium">{message}</p>
		</div>
	);
}
