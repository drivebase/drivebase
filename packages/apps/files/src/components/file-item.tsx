import { cn } from "@drivebase/ui/lib/cn"
import { FileIcon } from "@drivebase/ui/components/file-icon"
import { useEffect, useRef, type DragEventHandler, type MouseEventHandler } from "react"

export interface FileItemNode {
  id: string
  name: string
  type: "file" | "folder"
  size?: number | string | null
  remoteUpdatedAt?: string | null
}

export interface FileItemCommonProps {
  node: FileItemNode
  selected: boolean
  fileId?: string
  dragGroupSize?: number
  isDragLead?: boolean
  isRenaming?: boolean
  onRenameSubmit?: (value: string) => void
  onRenameCancel?: () => void
  onClick: MouseEventHandler<HTMLButtonElement>
  onDoubleClick: MouseEventHandler<HTMLButtonElement>
  /** Whether another drag is hovering over this folder item as a drop target. */
  isDragTarget?: boolean
  /** Dims this item while it is being dragged. */
  isDragging?: boolean
  onDragStart?: DragEventHandler<HTMLButtonElement>
  onDragEnd?: DragEventHandler<HTMLButtonElement>
  onDragOver?: DragEventHandler<HTMLButtonElement>
  onDragLeave?: DragEventHandler<HTMLButtonElement>
  onDrop?: DragEventHandler<HTMLButtonElement>
}

/**
 * Grid-cell variant: stacked icon over name, selection ring.
 */
export function FileItemGrid({
  node,
  selected,
  fileId,
  dragGroupSize = 0,
  isDragLead = false,
  isRenaming = false,
  onRenameSubmit,
  onRenameCancel,
  onClick,
  onDoubleClick,
  isDragTarget,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileItemCommonProps) {
  const isMultiDrag = dragGroupSize > 1

  const className = cn(
    "relative flex w-full flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-transparent px-2 py-3 text-center transition-colors",
    selected
      ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent-soft-fg)]"
      : "hover:bg-[var(--bg-subtle)]",
    isDragTarget && "border-[var(--accent)] bg-[var(--accent-soft)]",
    isDragging && "opacity-40",
    isDragLead && isMultiDrag && "border-[var(--accent)]/55 bg-[var(--accent-soft)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]",
  )

  const content = (
    <>
      {isDragLead && isMultiDrag ? (
        <>
          <span className="pointer-events-none absolute inset-x-2 inset-y-2 -z-10 rounded-[calc(var(--radius-md)+2px)] border border-[var(--accent)]/20 bg-[var(--accent)]/6 translate-x-1.5 translate-y-1.5" />
          <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent-fg)] shadow">
            {dragGroupSize}
          </span>
        </>
      ) : null}
      <FileIcon type={node.type} name={node.name} variant="lg" />
      {isRenaming ? (
        <InlineRenameField
          value={node.name}
          nodeType={node.type}
          className="w-full min-w-0 text-[11px] leading-tight text-[var(--fg)]"
          onSubmit={onRenameSubmit}
          onCancel={onRenameCancel}
        />
      ) : (
        <span className="w-full min-w-0 break-words text-[11px] leading-tight line-clamp-2 text-[var(--fg)]">
          {node.name}
        </span>
      )}
    </>
  )

  if (isRenaming) {
    return (
      <div
        data-file-id={fileId ?? node.id}
        className={className}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      data-file-id={fileId ?? node.id}
      draggable={!isRenaming}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={className}
      aria-pressed={selected}
    >
      {content}
    </button>
  )
}

/**
 * List-row variant: icon, name, size, modified.
 */
export function FileItemRow({
  node,
  selected,
  fileId,
  dragGroupSize = 0,
  isDragLead = false,
  isRenaming = false,
  onRenameSubmit,
  onRenameCancel,
  onClick,
  onDoubleClick,
  isDragTarget,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileItemCommonProps) {
  const isMultiDrag = dragGroupSize > 1

  const className = cn(
    "relative grid w-full grid-cols-[16px_1fr_80px_140px] items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-left text-xs transition-colors",
    selected
      ? "bg-[var(--accent-soft)] text-[var(--accent-soft-fg)]"
      : "hover:bg-[var(--bg-subtle)]",
    isDragTarget && "outline outline-2 outline-[var(--accent)]",
    isDragging && "opacity-40",
    isDragLead && isMultiDrag && "bg-[var(--accent-soft)] shadow-[0_8px_20px_rgba(0,0,0,0.14)] ring-1 ring-[var(--accent)]/35",
  )

  const content = (
    <>
      {isDragLead && isMultiDrag ? (
        <>
          <span className="pointer-events-none absolute inset-0 -z-10 rounded-[var(--radius-sm)] border border-[var(--accent)]/20 bg-[var(--accent)]/6 translate-x-1.5 translate-y-1.5" />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--accent-fg)] shadow">
            {dragGroupSize}
          </span>
        </>
      ) : null}
      <FileIcon type={node.type} name={node.name} variant="sm" />
      {isRenaming ? (
        <InlineRenameField
          value={node.name}
          nodeType={node.type}
          className="min-w-0 text-[var(--fg)]"
          onSubmit={onRenameSubmit}
          onCancel={onRenameCancel}
        />
      ) : (
        <span className="truncate text-[var(--fg)]">{node.name}</span>
      )}
      <span className="text-right text-[var(--fg-muted)] tabular-nums">
        {node.type === "folder" ? "—" : formatSize(node.size)}
      </span>
      <span className="text-right text-[var(--fg-muted)] tabular-nums">
        {formatDate(node.remoteUpdatedAt)}
      </span>
    </>
  )

  if (isRenaming) {
    return (
      <div
        data-file-id={fileId ?? node.id}
        className={className}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      data-file-id={fileId ?? node.id}
      draggable={!isRenaming}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={className}
      aria-pressed={selected}
    >
      {content}
    </button>
  )
}

function InlineRenameField({
  value,
  nodeType,
  className,
  onSubmit,
  onCancel,
}: {
  value: string
  nodeType: FileItemNode["type"]
  className?: string
  onSubmit?: (value: string) => void
  onCancel?: () => void
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const initialValueRef = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.textContent = value
    const raf = window.requestAnimationFrame(() => {
      el.focus()
      const end =
        nodeType === "file" && value.includes(".")
          ? Math.max(0, value.lastIndexOf("."))
          : value.length
      const selection = window.getSelection()
      if (!selection) return
      const range = document.createRange()
      const textNode = el.firstChild
      if (!textNode) return
      range.setStart(textNode, 0)
      range.setEnd(textNode, Math.min(end, textNode.textContent?.length ?? end))
      selection.removeAllRanges()
      selection.addRange(range)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [nodeType, value])

  const commit = () => {
    onSubmit?.(ref.current?.textContent ?? "")
  }

  const cancel = () => {
    if (ref.current) ref.current.textContent = initialValueRef.current
    onCancel?.()
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          commit()
        } else if (e.key === "Escape") {
          e.preventDefault()
          cancel()
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "block whitespace-pre-wrap break-words rounded-[var(--radius-sm)] bg-[var(--bg)]/70 px-1 py-0.5 outline-none",
        className,
      )}
    />
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
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
