import { format } from "date-fns";
import { AlertCircle, Loader2 } from "@/shared/components/icons/solar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFilePreview } from "@/features/files/hooks/useFilePreview";
import {
	useArchiveFile,
	useFile,
	useRefreshFileLifecycle,
	useRequestFileRestore,
} from "@/features/files/hooks/useFiles";
import { formatSize, getFileKind } from "@/features/files/utils";
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
	const supportsLifecycle = file?.provider.type === "S3";

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

	const kind = getFileKind(file.mimeType);
	const isPreviewable = kind === "image" || kind === "text";
	const defaultView = isPreviewable ? "preview" : "file";

	return (
		<Tabs defaultValue={defaultView} className="w-full">
			<TabsList variant="line" className="mb-4">
				<TabsTrigger value="file">File</TabsTrigger>
				<TabsTrigger value="metadata">Metadata</TabsTrigger>
				{isPreviewable && <TabsTrigger value="preview">Preview</TabsTrigger>}
			</TabsList>

			{isPreviewable && (
				<TabsContent value="preview">
					<FilePreview fileId={fileId} mimeType={file.mimeType} />
				</TabsContent>
			)}

			<TabsContent value="file" className="space-y-5">
				<div className="space-y-2">
					<SectionLabel>Storage Provider</SectionLabel>
					<div className="flex items-center gap-2 text-sm">
						<ProviderIcon type={file.provider.type} className="h-4 w-4" />
						<span>{file.provider.name}</span>
						<span className="text-muted-foreground">
							({file.provider.type.replace("_", " ")})
						</span>
					</div>
				</div>

				{supportsLifecycle && (
					<div className="flex flex-wrap gap-2">
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
									if (!input) return;
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
				)}

				<div className="space-y-3">
					<DetailRow label="Size" value={formatSize(file.size)} />
					<DetailRow label="MIME Type" value={file.mimeType} />
					<DetailRow label="Path" value={file.virtualPath} mono />
					<DetailRow label="File ID" value={file.id} mono />
					<DetailRow label="Remote ID" value={file.remoteId} mono />
					<DetailRow label="Hash" value={file.hash ?? "—"} mono />
				</div>
			</TabsContent>

			<TabsContent value="metadata" className="space-y-3">
				<DetailRow label="Uploaded By" value={file.user?.email ?? "Unknown"} />
				<DetailRow
					label="Created"
					value={format(new Date(file.createdAt), "MMM dd, yyyy HH:mm")}
				/>
				<DetailRow
					label="Updated"
					value={format(new Date(file.updatedAt), "MMM dd, yyyy HH:mm")}
				/>
				<DetailRow
					label="Lifecycle"
					value={formatLifecycle(file.lifecycle.state)}
				/>
				<DetailRow
					label="Storage Class"
					value={file.lifecycle.storageClass ?? "—"}
				/>
				<DetailRow
					label="Restore Requested"
					value={
						file.lifecycle.restoreRequestedAt
							? format(
									new Date(file.lifecycle.restoreRequestedAt),
									"MMM dd, yyyy HH:mm",
								)
							: "—"
					}
				/>
				<DetailRow
					label="Restore Expires"
					value={
						file.lifecycle.restoreExpiresAt
							? format(
									new Date(file.lifecycle.restoreExpiresAt),
									"MMM dd, yyyy HH:mm",
								)
							: "—"
					}
				/>
				<DetailRow
					label="Last Checked"
					value={
						file.lifecycle.lastCheckedAt
							? format(
									new Date(file.lifecycle.lastCheckedAt),
									"MMM dd, yyyy HH:mm",
								)
							: "—"
					}
				/>
			</TabsContent>
		</Tabs>
	);
}

function FilePreview({
	fileId,
	mimeType,
}: {
	fileId: string;
	mimeType: string;
}) {
	const { result, loading, error } = useFilePreview(fileId, mimeType);

	if (loading) {
		return (
			<div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				<span className="text-sm">Loading preview…</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center gap-2 py-20 text-destructive">
				<AlertCircle className="h-4 w-4" />
				<span className="text-sm">{error}</span>
			</div>
		);
	}

	if (!result) return null;

	if (result.type === "image") {
		return (
			<div className="w-full h-[50vh] bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden p-4">
				<img
					src={result.url}
					alt="Preview"
					className="max-w-full max-h-full object-contain"
				/>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{result.truncated && (
				<p className="text-xs text-muted-foreground">
					Showing first 100 KB of file.
				</p>
			)}
			<pre className="text-xs font-mono bg-muted/40 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
				{result.content}
			</pre>
		</div>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
			{children}
		</div>
	);
}

function DetailRow({
	label,
	value,
	mono = false,
}: {
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div className="grid grid-cols-[140px_1fr] gap-3 items-start text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className={mono ? "break-all font-mono text-xs" : "break-all"}>
				{value}
			</span>
		</div>
	);
}

function formatLifecycle(state: string): string {
	return state.toLowerCase().replace(/_/g, " ");
}
