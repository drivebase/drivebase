import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, RefreshCw, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type UploadQueueStatus =
	| "queued"
	| "uploading"
	| "transferring"
	| "success"
	| "error"
	| "cancelled";

export interface UploadQueueItem {
	id: string;
	name: string;
	size: number;
	progress: number;
	status: UploadQueueStatus;
	error?: string;
	sessionId?: string;
	phase?: "client_to_server" | "server_to_provider";
	canCancel?: boolean;
	canRetry?: boolean;
	destinationPath?: string;
}

interface UploadProgressPanelProps {
	items: UploadQueueItem[];
	onClose: () => void;
	onCancel?: (sessionId: string) => void;
	onRetry?: (sessionId: string) => void;
}

function formatBytes(bytes: number) {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const exp = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

function getPhaseLabel(item: UploadQueueItem): string | null {
	if (!item.phase) return null;
	if (item.status === "success" || item.status === "error") return null;

	if (item.phase === "client_to_server") {
		return "Uploading to server...";
	}
	if (item.phase === "server_to_provider") {
		return "Uploading to provider...";
	}
	return null;
}

function getStatusText(item: UploadQueueItem): string | null {
	switch (item.status) {
		case "success":
			return "Uploaded";
		case "error":
			return item.error || "Upload failed";
		case "cancelled":
			return "Cancelled";
		case "queued":
			return "Queued";
		case "transferring":
			return `Transferring ${item.progress}%`;
		case "uploading":
			return `Uploading ${item.progress}%`;
		default:
			return null;
	}
}

export function UploadProgressPanel({
	items,
	onClose,
	onCancel,
	onRetry,
}: UploadProgressPanelProps) {
	if (items.length === 0) return null;

	const hasActive = items.some(
		(item) =>
			item.status === "uploading" ||
			item.status === "queued" ||
			item.status === "transferring",
	);
	const completeCount = items.filter(
		(item) => item.status === "success",
	).length;
	const failedCount = items.filter((item) => item.status === "error").length;

	return (
		<div className="fixed right-6 bottom-6 z-50 w-[420px] rounded-xl border bg-background shadow-2xl">
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<div className="text-sm font-semibold">Uploads</div>
				<div className="flex items-center gap-3">
					<span className="text-xs text-muted-foreground">
						{completeCount} done
						{failedCount > 0 ? `, ${failedCount} failed` : ""}
					</span>
					{!hasActive ? (
						<Button size="sm" variant="ghost" onClick={onClose}>
							Close
						</Button>
					) : null}
				</div>
			</div>
			<div className="max-h-80 overflow-y-auto p-3 space-y-3">
				{items.map((item) => (
					<div key={item.id} className="rounded-lg space-y-2">
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<div className="text-sm font-medium truncate">{item.name}</div>
								<div className="text-xs text-muted-foreground">
									{formatBytes(item.size)}
								</div>
							</div>
							<div className="shrink-0 flex items-center gap-1">
								{item.canCancel && item.sessionId && onCancel ? (
									<Button
										size="icon"
										variant="ghost"
										className="h-6 w-6"
										onClick={() => onCancel(item.sessionId as string)}
										title="Cancel upload"
									>
										<X className="h-3.5 w-3.5" />
									</Button>
								) : null}
								{item.canRetry && item.sessionId && onRetry ? (
									<Button
										size="icon"
										variant="ghost"
										className="h-6 w-6"
										onClick={() => onRetry(item.sessionId as string)}
										title="Retry upload"
									>
										<RefreshCw className="h-3.5 w-3.5" />
									</Button>
								) : null}
								{item.status === "success" ? (
									<CheckCircle2 className="h-4 w-4 text-green-600" />
								) : null}
								{item.status === "error" ? (
									<XCircle className="h-4 w-4 text-destructive" />
								) : null}
								{item.status === "cancelled" ? (
									<XCircle className="h-4 w-4 text-muted-foreground" />
								) : null}
								{item.status === "uploading" ||
								item.status === "queued" ||
								item.status === "transferring" ? (
									<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
								) : null}
							</div>
						</div>
						<Progress value={item.progress} className="h-1.5" />
						<div className="flex items-center justify-between">
							<div className="text-xs text-muted-foreground">
								{item.status === "success" && item.destinationPath ? (
									<>
										Uploaded to{" "}
										<Link
											to="/files"
											search={{ path: item.destinationPath }}
											className="text-primary underline underline-offset-2 hover:text-primary/80"
										>
											{item.destinationPath}
										</Link>
									</>
								) : (
									getStatusText(item)
								)}
							</div>
							{getPhaseLabel(item) ? (
								<div className="text-xs text-muted-foreground italic">
									{getPhaseLabel(item)}
								</div>
							) : null}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
