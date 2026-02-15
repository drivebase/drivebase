import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { FileMimeIcon } from "@/features/files/FileMimeIcon";
import { useFile } from "@/features/files/hooks/useFiles";
import { formatFileTypeLabel, formatSize } from "@/features/files/utils";
import { ProviderIcon } from "@/features/providers/ProviderIcon";

interface FileInfoPanelProps {
	fileId: string;
}

export function FileInfoPanel({ fileId }: FileInfoPanelProps) {
	const { data, fetching, error } = useFile(fileId);
	const file = data?.file;

	if (fetching) {
		return (
			<div className="h-full flex items-center justify-center text-muted-foreground">
				<Loader2 className="h-5 w-5 animate-spin mr-2" />
				Loading file details...
			</div>
		);
	}

	if (error || !file) {
		return (
			<div className="text-sm text-destructive">
				Failed to load file details.
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<div className="flex items-center gap-3">
				<FileMimeIcon mimeType={file.mimeType} />
				<div>
					<h3 className="text-base font-semibold break-all">{file.name}</h3>
					<p className="text-xs text-muted-foreground">
						{formatFileTypeLabel(file.mimeType)}
					</p>
				</div>
			</div>

			<div className="space-y-2 rounded-md border p-3">
				<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
					Storage Provider
				</div>
				<div className="flex items-center gap-2 text-sm">
					<ProviderIcon type={file.provider.type} className="h-4 w-4" />
					<span>{file.provider.name}</span>
					<span className="text-muted-foreground">
						({file.provider.type.replace("_", " ")})
					</span>
				</div>
			</div>

			<div className="space-y-3 text-sm">
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">MIME Type</span>
					<span className="text-right break-all">{file.mimeType}</span>
				</div>
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">Size</span>
					<span>{formatSize(file.size)}</span>
				</div>
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">Path</span>
					<span className="text-right break-all">{file.virtualPath}</span>
				</div>
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">Uploaded By</span>
					<span className="text-right">{file.user?.email ?? "Unknown"}</span>
				</div>
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">Created</span>
					<span>{format(new Date(file.createdAt), "MMM dd, yyyy HH:mm")}</span>
				</div>
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">Updated</span>
					<span>{format(new Date(file.updatedAt), "MMM dd, yyyy HH:mm")}</span>
				</div>
			</div>
		</div>
	);
}
