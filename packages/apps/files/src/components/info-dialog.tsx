import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@drivebase/ui/components/dialog"
import { Button } from "@drivebase/ui/components/button"
import { FileIcon } from "@drivebase/ui/components/file-icon"
import type { FileItemNode } from "./file-item"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-24 shrink-0 text-xs text-[var(--fg-muted)]">{label}</span>
      <span className="min-w-0 flex-1 break-all text-xs text-[var(--fg)]">{value}</span>
    </div>
  )
}

function formatSize(size: FileItemNode["size"]): string {
  if (size == null) return "—"
  const n = typeof size === "string" ? Number(size) : size
  if (!Number.isFinite(n) || n < 0) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Shows metadata for a single file or folder node.
 */
export function InfoDialog({
  node,
  open,
  onClose,
}: {
  node: FileItemNode | null
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        {node ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <FileIcon type={node.type} name={node.name} variant="lg" />
                <DialogTitle className="min-w-0 flex-1 truncate">
                  {node.name}
                </DialogTitle>
              </div>
            </DialogHeader>

            <DialogBody className="pt-0">
              <div className="divide-y divide-[var(--border)]">
                <Row label="Kind" value={node.type === "folder" ? "Folder" : "File"} />
                {node.type === "file" ? (
                  <Row label="Size" value={formatSize(node.size)} />
                ) : null}
                <Row label="Modified" value={formatDate(node.remoteUpdatedAt)} />
                <Row label="ID" value={node.id} />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button tone="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
