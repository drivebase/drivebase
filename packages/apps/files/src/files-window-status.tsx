import { formatBytes } from "./files-app-utils"

interface UploadProgressLike {
  fileName: string
  loaded: number
  total: number
}

interface FilesWindowStatusProps {
  itemCount: number
  selectionCount: number
  uploadPending: boolean
  uploadProgress: UploadProgressLike | null
  duplicatePending: boolean
  copyPending: boolean
  movePending: boolean
  transferPending: boolean
  deletePending: boolean
  fetching: boolean
}

export function FilesWindowStatus({
  itemCount,
  selectionCount,
  uploadPending,
  uploadProgress,
  duplicatePending,
  copyPending,
  movePending,
  transferPending,
  deletePending,
  fetching,
}: FilesWindowStatusProps) {
  return (
    <footer className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1 text-[11px] text-[var(--fg-muted)]">
      <span>
        {itemCount} item{itemCount === 1 ? "" : "s"}
        {selectionCount > 0 ? ` · ${selectionCount} selected` : ""}
      </span>
      <span className="flex items-center gap-3">
        {uploadPending && uploadProgress
          ? `Uploading ${uploadProgress.fileName} · ${formatBytes(uploadProgress.loaded)} / ${formatBytes(uploadProgress.total)}`
          : null}
        {duplicatePending ? "Duplicating…" : null}
        {copyPending ? "Copying…" : null}
        {movePending ? "Moving…" : null}
        {transferPending ? "Transferring…" : null}
        {deletePending ? "Deleting…" : null}
        {fetching ? "Syncing…" : null}
      </span>
    </footer>
  )
}
