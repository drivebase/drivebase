import { format } from "date-fns";
import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	const defaultTab = isPreviewable ? "preview" : "file";

	return (
		<Tabs defaultValue={defaultTab} className="w-full">
			<TabsList variant="line" className="mb-4">
				{isPreviewable && <TabsTrigger value="preview">Preview</TabsTrigger>}
				<TabsTrigger value="file">File</TabsTrigger>
				<TabsTrigger value="metadata">Metadata</TabsTrigger>
			</TabsList>

			{isPreviewable && (
				<TabsContent value="preview">
					<PreviewPlaceholder kind={kind} name={file.name} />
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

function PreviewPlaceholder({
	kind,
	name,
}: {
	kind: "image" | "text";
	name: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground rounded-lg bg-muted/40">
			{kind === "image" ? (
				<ImageIcon className="h-12 w-12 opacity-30" />
			) : (
				<FileText className="h-12 w-12 opacity-30" />
			)}
			<div className="text-center space-y-1">
				<p className="text-sm font-medium text-foreground/60 truncate max-w-xs">
					{name}
				</p>
				<p className="text-xs">
					{kind === "image" ? "Image preview" : "Text preview"} coming soon
				</p>
			</div>
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
