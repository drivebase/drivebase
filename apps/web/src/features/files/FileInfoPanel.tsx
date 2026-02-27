import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileMimeIcon } from "@/features/files/FileMimeIcon";
import {
	useArchiveFile,
	useFile,
	useRefreshFileLifecycle,
	useRequestFileRestore,
} from "@/features/files/hooks/useFiles";
import { formatFileTypeLabel, formatSize } from "@/features/files/utils";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import { RestoreTier } from "@/gql/graphql";
import { promptDialog } from "@/shared/lib/promptDialog";

interface FileInfoPanelProps {
	fileId: string;
}

export function FileInfoPanel({ fileId }: FileInfoPanelProps) {
	const { data, fetching, error } = useFile(fileId);
	const [, archiveFile] = useArchiveFile();
	const [, requestFileRestore] = useRequestFileRestore();
	const [, refreshFileLifecycle] = useRefreshFileLifecycle();
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

			<div className="space-y-2">
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
			<div className="flex gap-2">
				{file.lifecycle.state === "HOT" ? (
					<Button
						size="sm"
						variant="outline"
						onClick={async () => {
							const result = await archiveFile({ id: file.id });
							if (result.error) {
								toast.error(result.error.message);
								return;
							}
							toast.success("Archive job queued");
						}}
					>
						Archive
					</Button>
				) : null}
				{file.lifecycle.state !== "HOT" ? (
					<Button
						size="sm"
						onClick={async () => {
							const input = await promptDialog(
								"Restore duration",
								"How many days should this file stay restored?",
								{
									defaultValue: "7",
									placeholder: "7",
									submitLabel: "Request restore",
								},
							);
							if (!input) {
								return;
							}
							const days = Number.parseInt(input, 10);
							if (!Number.isInteger(days) || days < 1 || days > 30) {
								toast.error("Days must be between 1 and 30");
								return;
							}
							const result = await requestFileRestore({
								id: file.id,
								input: { days, tier: RestoreTier.Standard },
							});
							if (result.error) {
								toast.error(result.error.message);
								return;
							}
							toast.success("Restore job queued");
						}}
					>
						Request Restore
					</Button>
				) : null}
				<Button
					size="sm"
					variant="ghost"
					onClick={async () => {
						const result = await refreshFileLifecycle({ id: file.id });
						if (result.error) {
							toast.error(result.error.message);
							return;
						}
						toast.success("Lifecycle refreshed");
					}}
				>
					Refresh Lifecycle
				</Button>
			</div>

			<div className="space-y-3 text-sm">
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">File ID</span>
					<span className="text-right break-all font-mono text-xs">
						{file.id}
					</span>
				</div>
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
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">Lifecycle</span>
					<span className="text-right">
						{formatLifecycle(file.lifecycle.state)}
					</span>
				</div>
				{file.lifecycle.storageClass ? (
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">Storage Class</span>
						<span className="text-right">{file.lifecycle.storageClass}</span>
					</div>
				) : null}
				{file.lifecycle.restoreExpiresAt ? (
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">Restore Expires</span>
						<span>
							{format(
								new Date(file.lifecycle.restoreExpiresAt),
								"MMM dd, yyyy HH:mm",
							)}
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}

function formatLifecycle(state: string): string {
	return state.toLowerCase().replace(/_/g, " ");
}
