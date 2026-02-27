import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FileInfoPanel } from "@/features/files/FileInfoPanel";
import { FileMimeIcon } from "@/features/files/FileMimeIcon";
import { useFile } from "@/features/files/hooks/useFiles";
import { useFileDetailsDialogStore } from "@/features/files/store/fileDetailsDialogStore";
import { formatFileTypeLabel } from "@/features/files/utils";

export function FileDetailsDialog() {
	const fileId = useFileDetailsDialogStore((state) => state.fileId);
	const open = useFileDetailsDialogStore((state) => state.open);
	const close = useFileDetailsDialogStore((state) => state.close);

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
			<DialogContent className="w-[min(45vw,1100px)] max-w-275 sm:max-w-275 max-h-[55vh] p-0 overflow-hidden text-sm">
				<DialogHeader className="px-6 py-4 border-b">
					{fileId ? (
						<FileDialogHeader fileId={fileId} />
					) : (
						<DialogTitle>File Details</DialogTitle>
					)}
				</DialogHeader>
				<div className="h-[calc(85vh-74px)] overflow-y-auto px-6 py-5">
					{fileId ? <FileInfoPanel fileId={fileId} /> : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function FileDialogHeader({ fileId }: { fileId: string }) {
	const { data } = useFile(fileId);
	const file = data?.file;

	if (!file) {
		return <DialogTitle>File Details</DialogTitle>;
	}

	return (
		<div className="flex items-center gap-3">
			<FileMimeIcon mimeType={file.mimeType} />
			<div className="min-w-0">
				<DialogTitle className="truncate text-sm font-semibold">
					{file.name}
				</DialogTitle>
				<DialogDescription>
					{formatFileTypeLabel(file.mimeType)}
				</DialogDescription>
			</div>
		</div>
	);
}
