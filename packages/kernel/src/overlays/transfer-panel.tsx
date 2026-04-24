import { useCallback, useEffect, useState } from "react"
import {
  useMyOperations,
  useOperationProgress,
  useResolveConflict,
  type OperationEntry,
} from "@drivebase/data"
import { cn } from "@drivebase/ui/lib/cn"
import { X, ArrowRight } from "lucide-react"
import { Checkbox } from "@drivebase/ui/components/checkbox"
import { useTransferStore, type UploadTransfer } from "../stores/transfer-store"
import { useSubscribe } from "../bus/use-subscribe"
import { usePanelDrag } from "./use-panel-drag"

const KIND_LABEL_ACTIVE: Record<string, string> = {
  upload: "Uploading",
  download: "Downloading",
  transfer: "Transferring",
  copy_tree: "Copying",
  move_tree: "Moving",
  delete_tree: "Deleting",
}

const KIND_LABEL_DONE: Record<string, string> = {
  upload: "Uploaded",
  download: "Downloaded",
  transfer: "Transferred",
  copy_tree: "Copied",
  move_tree: "Moved",
  delete_tree: "Deleted",
}

const STATUS_LABEL: Record<string, string> = {
  running: "Active",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
  planning: "Planning",
  awaiting_user: "Waiting",
  ready: "Ready",
}

const PANEL_OPERATION_KINDS = new Set([
  "upload",
  "download",
  "transfer",
  "copy_tree",
  "move_tree",
])

function uploadTransferPct(upload: UploadTransfer): number {
  if (upload.totalBytes <= 0) return 0
  return Math.min(100, (upload.transferredBytes / upload.totalBytes) * 100)
}

function aggregateUploadTransfers(transfers: UploadTransfer[]) {
  const totalBytes = transfers.reduce((sum, transfer) => sum + transfer.totalBytes, 0)
  const transferredBytes = transfers.reduce((sum, transfer) => sum + transfer.transferredBytes, 0)
  const hasProxy = transfers.some((transfer) => transfer.mode === "proxy")
  const allFinalizing = transfers.every((transfer) => transfer.phase === "finalizing")
  return { totalBytes, transferredBytes, hasProxy, allFinalizing }
}

function opLabel(
  op: OperationEntry,
  isTerminal: boolean,
  currentFileName: string | undefined,
): string {
  const count = op.summary?.totalEntries ?? op.entries.length
  const kind = isTerminal
    ? (KIND_LABEL_DONE[op.kind] ?? op.kind)
    : (KIND_LABEL_ACTIVE[op.kind] ?? op.kind)
  if (count <= 1) return op.entries[0]?.dstName ?? kind
  // Active multi-file: show the file currently being processed as the title
  if (!isTerminal && currentFileName) return currentFileName
  return `${kind} (${count})`
}

function formatBytes(n: number | string | null | undefined): string {
  if (n == null) return ""
  const v = typeof n === "string" ? Number(n) : n
  if (!Number.isFinite(v) || v < 0) return ""
  if (v < 1024) return `${v} B`
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`
  if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)} MB`
  return `${(v / 1024 ** 3).toFixed(2)} GB`
}

const TERMINAL = new Set(["succeeded", "failed", "cancelled"])
const VISIBLE = new Set(["running", "succeeded", "failed", "cancelled"])

/** A single operation row with its own progress subscription. */
function OperationRow({
  op,
  uploadTransfers,
  onRefetch,
}: {
  op: OperationEntry
  uploadTransfers: UploadTransfer[]
  onRefetch: () => void
}) {
  const shouldSubscribe = !TERMINAL.has(op.status) || uploadTransfers.length > 0
  const [localStatus, setLocalStatus] = useState<string>(op.status)
  const [jobBytes, setJobBytes] = useState<Record<string, number>>({})
  const [failedCount, setFailedCount] = useState(op.jobCounts?.failed ?? 0)
  const [skippedCount, setSkippedCount] = useState(op.jobCounts?.skipped ?? 0)
  const [succeededCount, setSucceededCount] = useState(op.jobCounts?.succeeded ?? 0)
  const [doneCount, setDoneCount] = useState(
    (op.jobCounts?.succeeded ?? 0) + (op.jobCounts?.failed ?? 0) + (op.jobCounts?.skipped ?? 0),
  )
  const [resolvedConflictIds, setResolvedConflictIds] = useState(() => new Set<string>())
  const [applyToAll, setApplyToAll] = useState(false)
  const [, resolveConflict] = useResolveConflict()
  const { event, conflicts } = useOperationProgress(shouldSubscribe ? op.id : null)
  const pendingConflicts = conflicts.filter((c) => !resolvedConflictIds.has(c.conflictId))

  // Keep localStatus in sync with query data unless we've seen a terminal event
  useEffect(() => {
    setLocalStatus(op.status)
  }, [op.status])

  useEffect(() => {
    if (!event) return
    if (event.__typename === "ProgressEvent") {
      setJobBytes((prev) => ({ ...prev, [event.jobId]: Number(event.bytes ?? 0) }))
    }
    if (event.__typename === "JobStatusEvent") {
      const s = event.jobStatus
      if (s === "succeeded") {
        setSucceededCount((n) => n + 1)
        setDoneCount((n) => n + 1)
      } else if (s === "failed") {
        setFailedCount((n) => n + 1)
        setDoneCount((n) => n + 1)
      } else if (s === "skipped") {
        setSkippedCount((n) => n + 1)
        setDoneCount((n) => n + 1)
      }
    }
    if (event.__typename === "OperationStatusEvent") {
      setLocalStatus(event.lifecycleStatus)
      onRefetch()
    }
  }, [event, onRefetch])

  const bytesTransferred = Object.values(jobBytes).reduce((a, b) => a + b, 0)
  const totalBytes = Number(op.summary?.totalBytes ?? 0)
  const totalEntries = op.summary?.totalEntries ?? 0
  const isTerminal = TERMINAL.has(localStatus)
  const kindLabel = isTerminal
    ? (KIND_LABEL_DONE[op.kind] ?? op.kind)
    : (KIND_LABEL_ACTIVE[op.kind] ?? op.kind)

  const failedJobs = failedCount
  const skippedJobs = skippedCount
  const succeededJobs = succeededCount
  const doneJobs = doneCount

  const currentEntry = op.entries[doneJobs] ?? op.entries[op.entries.length - 1]
  const currentFileName = currentEntry?.dstName
  const label = opLabel(op, isTerminal, currentFileName)

  const firstConflict = pendingConflicts[0]

  const handleResolve = useCallback(
    (action: "overwrite" | "skip" | "rename") => {
      if (!firstConflict) return
      resolveConflict({ conflictId: firstConflict.conflictId, action, applyToAll })
      setResolvedConflictIds((prev) => {
        const next = new Set(prev)
        if (applyToAll) {
          for (const c of conflicts) next.add(c.conflictId)
        } else {
          next.add(firstConflict.conflictId)
        }
        return next
      })
      setApplyToAll(false)
    },
    [firstConflict, conflicts, resolveConflict, applyToAll],
  )

  const storagePct = totalBytes > 0 ? Math.min(1, bytesTransferred / totalBytes) : 0
  const jobPct = totalEntries > 0 ? Math.min(1, doneJobs / totalEntries) : 0
  // Skipped files contribute 0 bytes but count as done jobs. Take the max so
  // the bar and byte display both advance when files are skipped.
  const progressPct = Math.max(storagePct, jobPct)
  // Synthesize effective bytes for the label: if job-based progress implies
  // more data done than actual bytes (i.e. some files were skipped), use the
  // proportional estimate so the display doesn't stay stuck at "0 B / 1.2 MB".
  const effectiveBytesTransferred = totalBytes > 0
    ? Math.max(bytesTransferred, Math.round(jobPct * totalBytes))
    : bytesTransferred
  const indeterminate = !isTerminal && progressPct === 0

  const uploadAgg = uploadTransfers.length > 0
    ? aggregateUploadTransfers(uploadTransfers)
    : null

  let pct = Math.min(100, progressPct * 100)
  let bytesLabel = ""
  let phaseLabel = kindLabel
  if (!isTerminal && totalEntries > 1 && op.kind !== "upload") {
    phaseLabel = `${kindLabel} ${Math.min(doneJobs + 1, totalEntries)}/${totalEntries}`
  }

  if (isTerminal) {
    // Show bytes if known; otherwise show file count
    bytesLabel = totalBytes > 0
      ? formatBytes(totalBytes)
      : totalEntries > 0
        ? `${totalEntries} item${totalEntries === 1 ? "" : "s"}`
        : ""
  } else if (totalBytes > 0) {
    bytesLabel = `${formatBytes(effectiveBytesTransferred)} / ${formatBytes(totalBytes)}`
  } else if (effectiveBytesTransferred > 0) {
    bytesLabel = formatBytes(effectiveBytesTransferred)
  }

  if (op.kind === "upload" && uploadAgg) {
    const uploadPct = uploadAgg.totalBytes > 0
      ? Math.min(100, (uploadAgg.transferredBytes / uploadAgg.totalBytes) * 100)
      : 0
    if (localStatus === "ready" || !uploadAgg.allFinalizing) {
      pct = uploadAgg.hasProxy ? uploadPct * 0.5 : uploadPct
      bytesLabel = `${formatBytes(uploadAgg.transferredBytes)} / ${formatBytes(uploadAgg.totalBytes)}`
      phaseLabel = uploadAgg.hasProxy ? "Receiving upload" : "Uploading"
    } else if (uploadAgg.hasProxy) {
      pct = 50 + storagePct * 50
      phaseLabel = isTerminal ? kindLabel : "Uploading"
    } else {
      pct = 100
      bytesLabel = formatBytes(uploadAgg.totalBytes)
      phaseLabel = isTerminal ? kindLabel : "Finalizing"
    }
  }

  return (
    <div className={cn("rounded-[var(--radius-sm)] px-2.5 py-2 hover:bg-[var(--bg-subtle)]")}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--fg)]">
          {label}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide",
            localStatus === "running" && "bg-[var(--accent-soft)] text-[var(--accent-soft-fg)]",
            localStatus === "succeeded" && failedJobs === 0 && "bg-[oklch(0.94_0.04_150)] text-[oklch(0.38_0.12_150)] dark:bg-[oklch(0.3_0.04_150)] dark:text-[oklch(0.72_0.14_155)]",
            (localStatus === "failed" || (localStatus === "succeeded" && failedJobs > 0)) && "bg-[oklch(0.94_0.04_25)] text-[var(--danger)] dark:bg-[oklch(0.3_0.05_25)]",
            !["running", "succeeded", "failed"].includes(localStatus) && "bg-[var(--bg-muted)] text-[var(--fg-muted)]",
          )}
        >
          {localStatus === "succeeded" && failedJobs > 0
            ? "Partial"
            : (STATUS_LABEL[localStatus] ?? localStatus)}
        </span>
      </div>

      <div className="mt-0.5 flex items-center justify-between text-[10.5px] tabular-nums text-[var(--fg-subtle)]">
        {isTerminal && (failedJobs > 0 || skippedJobs > 0) ? (
          <span className="min-w-0 flex-1 truncate">
            {succeededJobs > 0 && `${succeededJobs} transferred`}
            {failedJobs > 0 && (
              <span className="text-[var(--danger)]">
                {succeededJobs > 0 ? " · " : ""}{failedJobs} failed
              </span>
            )}
            {skippedJobs > 0 && `${failedJobs > 0 || succeededJobs > 0 ? " · " : ""}${skippedJobs} skipped`}
          </span>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">
              {isTerminal ? kindLabel : phaseLabel}
            </span>
            <span>{bytesLabel}</span>
          </>
        )}
      </div>

      {!isTerminal && (
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-[oklch(0_0_0/0.08)] dark:bg-[oklch(1_0_0/0.08)]">
          {indeterminate ? (
            <div className="h-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-[var(--accent)] opacity-70" />
          ) : (
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      )}

      {firstConflict && (
        <div className="mt-2">
          <p className="text-[10px] text-[var(--fg-muted)]">already exists at destination</p>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleResolve("skip")}
              className="rounded-[4px] px-2.5 py-1 text-[10.5px] text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => handleResolve("rename")}
              className="rounded-[4px] px-2.5 py-1 text-[10.5px] text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              Keep both
            </button>
            <button
              type="button"
              onClick={() => handleResolve("overwrite")}
              className="rounded-[4px] px-2.5 py-1 text-[10.5px] text-[var(--danger)] hover:bg-[oklch(0.94_0.04_25)] dark:hover:bg-[oklch(0.22_0.04_25)] transition-colors"
            >
              Replace
            </button>

            <label className="ml-auto flex cursor-pointer items-center gap-1.5 select-none">
              <Checkbox
                checked={applyToAll}
                onCheckedChange={(v) => setApplyToAll(v === true)}
                className="size-3 rounded-[3px]"
              />
              <span className="text-[10px] text-[var(--fg-muted)]">Apply to all</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadTransferRow({ transfer }: { transfer: UploadTransfer }) {
  const pct = transfer.mode === "proxy"
    ? uploadTransferPct(transfer) * 0.5
    : uploadTransferPct(transfer)
  const phaseLabel = transfer.mode === "proxy" ? "Receiving upload" : "Uploading"

  return (
    <div className="rounded-[var(--radius-sm)] px-2.5 py-2 hover:bg-[var(--bg-subtle)]">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--fg)]">
          {transfer.fileName}
        </span>
        <span className="shrink-0 rounded-[3px] bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-[var(--accent-soft-fg)]">
          Active
        </span>
      </div>

      <div className="mt-0.5 flex items-center justify-between text-[10.5px] tabular-nums text-[var(--fg-subtle)]">
        <span>{phaseLabel}</span>
        <span>
          {formatBytes(transfer.transferredBytes)} / {formatBytes(transfer.totalBytes)}
        </span>
      </div>

      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-[oklch(0_0_0/0.08)] dark:bg-[oklch(1_0_0/0.08)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** Default bottom-right position, above the dock. */
function defaultPosition(): { x: number; y: number } {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 }
  }
  return {
    x: window.innerWidth - 360,
    y: window.innerHeight - 480,
  }
}

export function TransferPanel() {
  const open = useTransferStore((s) => s.open)
  const storedX = useTransferStore((s) => s.x)
  const storedY = useTransferStore((s) => s.y)
  const uploadTransfers = useTransferStore((s) => s.uploadTransfers)
  const finishUploadTransfer = useTransferStore((s) => s.finishUploadTransfer)
  const setPosition = useTransferStore((s) => s.setPosition)
  const setOpen = useTransferStore((s) => s.setOpen)
  const [closing, setClosing] = useState(false)

  const { operations, refetch } = useMyOperations()

  useSubscribe("transfer.open", useCallback(() => {
    setClosing(false)
    setOpen(true)
  }, [setOpen]))

  // Auto-open and refetch when any operation starts
  useSubscribe("transfer.start", useCallback(() => {
    setClosing(false)
    setOpen(true)
    // Small delay to avoid race with panel mounting
    setTimeout(() => refetch(), 50)
  }, [setOpen, refetch]))

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 180)
  }, [setOpen])

  // Resolve position (default on first open)
  const pos = storedX < 0
    ? defaultPosition()
    : { x: storedX, y: storedY }

  const commit = useCallback(
    (x: number, y: number) => setPosition(x, y),
    [setPosition],
  )
  const { onPointerDown } = usePanelDrag(commit)

  const uploadTransferList = Object.values(uploadTransfers).sort(
    (a, b) => b.createdAt - a.createdAt,
  )
  const uploadTransfersByOperation = uploadTransferList.reduce<Record<string, UploadTransfer[]>>(
    (acc, transfer) => {
      ;(acc[transfer.operationId] ??= []).push(transfer)
      return acc
    },
    {},
  )
  const visible = operations.filter(
    (op) =>
      PANEL_OPERATION_KINDS.has(op.kind) &&
      (VISIBLE.has(op.status) || (op.kind === "upload" && (uploadTransfersByOperation[op.id]?.length ?? 0) > 0)),
  )
  const renderedOperationIds = new Set(visible.map((op) => op.id))
  const pendingOnlyTransfers = uploadTransferList.filter(
    (transfer) => !renderedOperationIds.has(transfer.operationId),
  )
  const activeCount = visible.filter((op) => !TERMINAL.has(op.status)).length +
    pendingOnlyTransfers.length

  useEffect(() => {
    for (const op of visible) {
      if (op.kind === "upload" && TERMINAL.has(op.status)) {
        for (const transfer of uploadTransfersByOperation[op.id] ?? []) {
          finishUploadTransfer(transfer.id)
        }
      }
    }
  }, [visible, uploadTransfersByOperation, finishUploadTransfer])

  if (!open) return null

  return (
    <div
      className={cn(
        "glass-strong window-shadow fixed z-[1190] flex w-[340px] flex-col overflow-hidden rounded-[var(--window-radius)] border border-[var(--glass-border)]",
        closing ? "animate-window-close" : "animate-window-open",
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header — drag handle */}
      <div
        className="flex cursor-default items-center gap-2 border-b border-[var(--border)] px-3 py-2.5"
        onPointerDown={(e) => onPointerDown(e, pos.x, pos.y)}
      >
        <ArrowRight size={13} className="shrink-0 text-[var(--fg-muted)]" />
        <span className="text-[12px] font-medium text-[var(--fg)]">Transfers</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-soft-fg)]">
            {activeCount} active
          </span>
        )}
        <button
          type="button"
          data-no-drag
          onClick={handleClose}
          className="ml-auto flex size-5 items-center justify-center rounded text-[var(--fg-subtle)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)]"
        >
          <X size={12} />
        </button>
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto p-1.5">
        {visible.length === 0 && pendingOnlyTransfers.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-[var(--fg-subtle)]">
            No transfers yet.
          </p>
        ) : (
          <>
            {pendingOnlyTransfers.map((transfer) => (
              <UploadTransferRow key={transfer.id} transfer={transfer} />
            ))}
            {visible.map((op) => (
              <OperationRow
                key={op.id}
                op={op}
                uploadTransfers={uploadTransfersByOperation[op.id] ?? []}
                onRefetch={refetch}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
