import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type UploadQueueStatus = "queued" | "uploading" | "success" | "error";

export interface UploadQueueItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadQueueStatus;
  error?: string;
}

interface UploadProgressPanelProps {
  items: UploadQueueItem[];
  onClose: () => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

export function UploadProgressPanel({ items, onClose }: UploadProgressPanelProps) {
  if (items.length === 0) return null;

  const hasUploading = items.some((item) => item.status === "uploading" || item.status === "queued");
  const completeCount = items.filter((item) => item.status === "success").length;
  const failedCount = items.filter((item) => item.status === "error").length;

  return (
    <div className="fixed right-6 bottom-6 z-50 w-[420px] rounded-xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="text-sm font-semibold">
          Uploads
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {completeCount} done{failedCount > 0 ? `, ${failedCount} failed` : ""}
          </span>
          {!hasUploading ? (
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
                <div className="text-xs text-muted-foreground">{formatBytes(item.size)}</div>
              </div>
              <div className="shrink-0">
                {item.status === "success" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : null}
                {item.status === "error" ? <XCircle className="h-4 w-4 text-destructive" /> : null}
                {item.status === "uploading" || item.status === "queued" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            </div>
            <Progress value={item.progress} className="h-1.5" />
            <div className="text-xs text-muted-foreground">
              {item.status === "success" ? "Uploaded" : null}
              {item.status === "error" ? item.error || "Upload failed" : null}
              {item.status === "queued" ? "Queued" : null}
              {item.status === "uploading" ? `Uploading ${item.progress}%` : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
