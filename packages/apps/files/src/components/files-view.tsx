import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react"
import { ContextMenuZone } from "@drivebase/kernel"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  GRID_MIN_COL_PX,
  GRID_ROW_PX,
  LIST_ROW_PX,
  VIRTUAL_OVERSCAN,
  VIRTUALIZE_THRESHOLD,
} from "../config"
import { useNodeDnd } from "../hooks/use-node-dnd"
import type {
  FilesBackgroundMenuPayload,
  FilesItemMenuPayload,
} from "../menus"
import type { FilesCommandContext } from "../file-commands"
import { FileItemGrid, FileItemRow, type FileItemNode } from "./file-item"

export interface FilesViewProps {
  nodes: FileItemNode[]
  view: "grid" | "list"
  selection: Set<string>
  /** ID of the folder currently shown (used to filter self-drops). */
  currentFolderId: string | null
  /** Provider owning the listed nodes. */
  providerId: string
  /** Kernel window ID — included in the drag payload. */
  windowId: string
  onItemClick: (
    id: string,
    orderedIds: string[],
    event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
  ) => void
  onItemDoubleClick: (node: FileItemNode) => void
  onBackgroundClick: () => void
  onSelectionReplace: (ids: string[]) => void
  renamingId: string | null
  onRenameSubmit: (value: string) => void
  onRenameCancel: () => void
  onOpenNode: (node: FileItemNode) => void
  onOpenNodeInNewWindow: (node: FileItemNode) => void
  onCopyNode: (node: FileItemNode) => void
  onCutNode: (node: FileItemNode) => void
  onPasteIntoFolder: (node: FileItemNode) => void
  canPasteIntoFolder: (node: FileItemNode) => boolean
  onDownloadNode: (node: FileItemNode) => void
  onRenameNode: (node: FileItemNode) => void
  onDuplicateNode: (node: FileItemNode) => void
  onDeleteNode: (node: FileItemNode) => void
  onInfoNode: (node: FileItemNode) => void
  commandContext: FilesCommandContext
  /**
   * Fired when nodes are dropped onto a folder or the background.
   * `dstParentId: null` means drop onto the current folder.
   * `sourceProviderId` is from the drag payload — may differ from `providerId`
   * for cross-window/provider moves.
   */
  onDropNodes: (
    nodeIds: string[],
    sourceProviderId: string,
    dstParentId: string | null,
    altKey: boolean,
  ) => void
}

/**
 * Dispatches between grid and list. Folders sort first, then alphabetical
 * within each group. Background click clears selection. Each item is wrapped
 * in a `<ContextMenuZone zone="files.item">` and the empty pane in a
 * `<ContextMenuZone zone="files.background">` so apps can contribute entries.
 *
 * Lists with more than `VIRTUALIZE_THRESHOLD` items render through
 * `@tanstack/react-virtual` — the grid virtualizes rows of N columns where N
 * is derived from the live container width via ResizeObserver.
 *
 * Drag-and-drop: dragging items dims them to 0.4 opacity; hovering a folder
 * shows an accent outline. Dropping fires `onDropNodes`.
 */
export function FilesView({
  nodes,
  view,
  selection,
  currentFolderId,
  providerId,
  windowId,
  onItemClick,
  onItemDoubleClick,
  onBackgroundClick,
  onSelectionReplace,
  renamingId,
  onRenameSubmit,
  onRenameCancel,
  onOpenNode,
  onOpenNodeInNewWindow,
  onCopyNode,
  onCutNode,
  onPasteIntoFolder,
  canPasteIntoFolder,
  onDownloadNode,
  onRenameNode,
  onDuplicateNode,
  onDeleteNode,
  onInfoNode,
  commandContext,
  onDropNodes,
}: FilesViewProps) {
  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  const orderedIds = sorted.map((n) => n.id)
  const nodesById = useMemo(
    () => new Map(sorted.map((node) => [node.id, { id: node.id, type: node.type }])),
    [sorted],
  )

  const dnd = useNodeDnd({
    providerId,
    windowId,
    currentFolderId,
    nodesById,
    selection,
    onDrop: onDropNodes,
  })

  const backgroundPayload: FilesBackgroundMenuPayload = {
    commandContext: {
      busy: commandContext.busy,
      canPaste: commandContext.canPaste,
      actions: commandContext.actions,
    },
  }
  const suppressBackgroundClickRef = useRef(false)
  const marquee = useMarqueeSelection({
    onSelectionReplace,
    disabled: renamingId !== null,
    onSelectStart: () => {
      suppressBackgroundClickRef.current = true
    },
  })

  const clickNode = (e: MouseEvent, id: string) => {
    e.stopPropagation()
    onItemClick(id, orderedIds, {
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
    })
  }

  const itemPayload = (node: FileItemNode): FilesItemMenuPayload => ({
    node,
    commandContext,
    nodeActions: {
      open: () => onOpenNode(node),
      openInNewWindow: () => onOpenNodeInNewWindow(node),
      copy: () => onCopyNode(node),
      cut: () => onCutNode(node),
      rename: () => onRenameNode(node),
      duplicate: () => void onDuplicateNode(node),
      download: () => onDownloadNode(node),
      delete: () => void onDeleteNode(node),
      info: () => onInfoNode(node),
      pasteIntoFolder: () => onPasteIntoFolder(node),
      canPasteIntoFolder: node.type === "folder" ? canPasteIntoFolder(node) : false,
    },
  })

  // Only folders accept drops; files and the current folder itself are skipped.
  const folderDndProps = (node: FileItemNode) =>
    node.type === "folder" && node.id !== currentFolderId
      ? {
          isDragTarget: dnd.dragOverId === node.id,
          onDragOver: (e: DragEvent<HTMLButtonElement>) =>
            dnd.handleFolderDragOver(e, node.id),
          onDragLeave: (e: DragEvent<HTMLButtonElement>) =>
            dnd.handleFolderDragLeave(e, node.id),
          onDrop: (e: DragEvent<HTMLButtonElement>) =>
            dnd.handleFolderDrop(e, node.id),
        }
      : {}

  const renderItem = (n: FileItemNode, Comp: typeof FileItemGrid | typeof FileItemRow) => (
    <ContextMenuZone
      key={n.id}
      zone="files.item"
      payload={itemPayload(n)}
      asChild={false}
    >
      <Comp
        node={n}
        fileId={n.id}
        selected={selection.has(n.id)}
        isRenaming={renamingId === n.id}
        onRenameSubmit={onRenameSubmit}
        onRenameCancel={onRenameCancel}
        isDragging={dnd.draggingIds.has(n.id)}
        dragGroupSize={dnd.draggingIds.size}
        isDragLead={dnd.dragLeadId === n.id}
        onClick={(e) => clickNode(e, n.id)}
        onDoubleClick={() => onItemDoubleClick(n)}
        onDragStart={(e) => dnd.handleDragStart(e, n.id)}
        onDragEnd={dnd.handleDragEnd}
        {...folderDndProps(n)}
      />
    </ContextMenuZone>
  )

  if (sorted.length === 0) {
    return (
      <ContextMenuZone
        zone="files.background"
        payload={backgroundPayload}
        asChild={false}
        className="flex flex-1 items-center justify-center text-xs text-[var(--fg-muted)]"
      >
        <div
          onClick={() => {
            if (suppressBackgroundClickRef.current) {
              suppressBackgroundClickRef.current = false
              return
            }
            onBackgroundClick()
          }}
          onDragOver={dnd.handleBackgroundDragOver}
          onDragLeave={dnd.handleBackgroundDragLeave}
          onDrop={dnd.handleBackgroundDrop}
          className="flex h-full w-full items-center justify-center"
        >
          This folder is empty.
        </div>
      </ContextMenuZone>
    )
  }

  const virtualize = sorted.length > VIRTUALIZE_THRESHOLD

  if (view === "grid") {
    return virtualize ? (
      <VirtualGrid
        sorted={sorted}
        selection={selection}
        backgroundPayload={backgroundPayload}
        renderItem={(n) => renderItem(n, FileItemGrid)}
        onBackgroundClick={onBackgroundClick}
        onSelectionReplace={onSelectionReplace}
        onBackgroundDragOver={dnd.handleBackgroundDragOver}
        onBackgroundDragLeave={dnd.handleBackgroundDragLeave}
        onBackgroundDrop={dnd.handleBackgroundDrop}
        isBackgroundDragTarget={dnd.dragOverId === "__background__"}
        windowId={windowId}
        marqueeDisabled={renamingId !== null}
        suppressBackgroundClickRef={suppressBackgroundClickRef}
      />
    ) : (
      <ContextMenuZone
        zone="files.background"
        payload={backgroundPayload}
        asChild={false}
        className="flex-1 overflow-y-auto"
      >
        <div
          ref={marquee.contentRef}
          onClick={() => {
            if (suppressBackgroundClickRef.current) {
              suppressBackgroundClickRef.current = false
              return
            }
            onBackgroundClick()
          }}
          onPointerDown={marquee.handlePointerDown}
          onDragOver={dnd.handleBackgroundDragOver}
          onDragLeave={dnd.handleBackgroundDragLeave}
          onDrop={dnd.handleBackgroundDrop}
          className="relative min-h-full px-3 py-3"
        >
          {marquee.rect ? <SelectionOverlay rect={marquee.rect} /> : null}
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${GRID_MIN_COL_PX}px, 1fr))`,
            }}
          >
            {sorted.map((n) => renderItem(n, FileItemGrid))}
          </div>
        </div>
      </ContextMenuZone>
    )
  }

  return virtualize ? (
    <VirtualList
      sorted={sorted}
      selection={selection}
      backgroundPayload={backgroundPayload}
      renderItem={(n) => renderItem(n, FileItemRow)}
      onBackgroundClick={onBackgroundClick}
      onSelectionReplace={onSelectionReplace}
      onBackgroundDragOver={dnd.handleBackgroundDragOver}
      onBackgroundDragLeave={dnd.handleBackgroundDragLeave}
      onBackgroundDrop={dnd.handleBackgroundDrop}
      isBackgroundDragTarget={dnd.dragOverId === "__background__"}
      windowId={windowId}
      marqueeDisabled={renamingId !== null}
      suppressBackgroundClickRef={suppressBackgroundClickRef}
    />
  ) : (
    <ContextMenuZone
      zone="files.background"
      payload={backgroundPayload}
      asChild={false}
      className="flex-1 overflow-y-auto"
    >
      <div
        ref={marquee.contentRef}
        onClick={() => {
          if (suppressBackgroundClickRef.current) {
            suppressBackgroundClickRef.current = false
            return
          }
          onBackgroundClick()
        }}
        onPointerDown={marquee.handlePointerDown}
        onDragOver={dnd.handleBackgroundDragOver}
        onDragLeave={dnd.handleBackgroundDragLeave}
        onDrop={dnd.handleBackgroundDrop}
        className="relative min-h-full px-2 py-1"
      >
        {marquee.rect ? <SelectionOverlay rect={marquee.rect} /> : null}
        <ListHeader />
        <div className="flex flex-col gap-0.5">
          {sorted.map((n) => renderItem(n, FileItemRow))}
        </div>
      </div>
    </ContextMenuZone>
  )
}

function ListHeader() {
  return (
    <div className="grid grid-cols-[16px_1fr_80px_140px] gap-2 px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-subtle)]">
      <span aria-hidden />
      <span>Name</span>
      <span className="text-right">Size</span>
      <span className="text-right">Modified</span>
    </div>
  )
}

interface VirtualChildProps {
  sorted: FileItemNode[]
  selection: Set<string>
  backgroundPayload: FilesBackgroundMenuPayload
  renderItem: (node: FileItemNode) => React.ReactNode
  onBackgroundClick: () => void
  onSelectionReplace: (ids: string[]) => void
  onBackgroundDragOver: (e: DragEvent<HTMLDivElement>) => void
  onBackgroundDragLeave: () => void
  onBackgroundDrop: (e: DragEvent<HTMLDivElement>, windowId: string) => void
  isBackgroundDragTarget: boolean
  windowId: string
  marqueeDisabled: boolean
  suppressBackgroundClickRef: MutableRefObject<boolean>
}

function VirtualGrid({
  sorted,
  backgroundPayload,
  renderItem,
  onBackgroundClick,
  onSelectionReplace,
  onBackgroundDragOver,
  onBackgroundDragLeave,
  onBackgroundDrop,
  windowId,
  marqueeDisabled,
  suppressBackgroundClickRef,
}: VirtualChildProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [colCount, setColCount] = useState(4)
  const marquee = useMarqueeSelection({
    onSelectionReplace,
    disabled: marqueeDisabled,
    onSelectStart: () => {
      suppressBackgroundClickRef.current = true
    },
    getScrollElement: () => scrollRef.current,
  })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const width = el.clientWidth - 24
      const cols = Math.max(1, Math.floor(width / GRID_MIN_COL_PX))
      setColCount(cols)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rowCount = Math.ceil(sorted.length / colCount)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => GRID_ROW_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <ContextMenuZone
        zone="files.background"
        payload={backgroundPayload}
        asChild={false}
        className="block"
      >
        <div
          ref={marquee.contentRef}
          onClick={() => {
            if (suppressBackgroundClickRef.current) {
              suppressBackgroundClickRef.current = false
              return
            }
            onBackgroundClick()
          }}
          onPointerDown={marquee.handlePointerDown}
          onDragOver={onBackgroundDragOver}
          onDragLeave={onBackgroundDragLeave}
          onDrop={(e) => onBackgroundDrop(e, windowId)}
          className="relative min-h-full px-3 py-3"
          style={{ height: virtualizer.getTotalSize() + 24 }}
        >
          {marquee.rect ? <SelectionOverlay rect={marquee.rect} /> : null}
          {virtualizer.getVirtualItems().map((vr) => {
            const start = vr.index * colCount
            const rowItems = sorted.slice(start, start + colCount)
            return (
              <div
                key={vr.index}
                className="absolute left-3 right-3"
                style={{ transform: `translateY(${vr.start + 12}px)` }}
              >
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
                  }}
                >
                  {rowItems.map((n) => renderItem(n))}
                </div>
              </div>
            )
          })}
        </div>
      </ContextMenuZone>
    </div>
  )
}

function VirtualList({
  sorted,
  backgroundPayload,
  renderItem,
  onBackgroundClick,
  onSelectionReplace,
  onBackgroundDragOver,
  onBackgroundDragLeave,
  onBackgroundDrop,
  windowId,
  marqueeDisabled,
  suppressBackgroundClickRef,
}: VirtualChildProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const marquee = useMarqueeSelection({
    onSelectionReplace,
    disabled: marqueeDisabled,
    onSelectStart: () => {
      suppressBackgroundClickRef.current = true
    },
    getScrollElement: () => scrollRef.current,
  })

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => LIST_ROW_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-2">
        <ListHeader />
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <ContextMenuZone
          zone="files.background"
          payload={backgroundPayload}
          asChild={false}
          className="block"
        >
          <div
            ref={marquee.contentRef}
            onClick={() => {
              if (suppressBackgroundClickRef.current) {
                suppressBackgroundClickRef.current = false
                return
              }
              onBackgroundClick()
            }}
            onPointerDown={marquee.handlePointerDown}
            onDragOver={onBackgroundDragOver}
            onDragLeave={onBackgroundDragLeave}
            onDrop={(e) => onBackgroundDrop(e, windowId)}
            className="relative min-h-full px-2"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {marquee.rect ? <SelectionOverlay rect={marquee.rect} /> : null}
            {virtualizer.getVirtualItems().map((vr) => {
              const n = sorted[vr.index]
              if (!n) return null
              return (
                <div
                  key={n.id}
                  className="absolute left-2 right-2"
                  style={{ transform: `translateY(${vr.start}px)` }}
                >
                  {renderItem(n)}
                </div>
              )
            })}
          </div>
        </ContextMenuZone>
      </div>
    </div>
  )
}

interface SelectionRect {
  left: number
  top: number
  width: number
  height: number
}

function SelectionOverlay({ rect }: { rect: SelectionRect }) {
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-[var(--radius-sm)] border border-[var(--accent)]/60 bg-[var(--accent)]/12"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  )
}

function useMarqueeSelection({
  onSelectionReplace,
  onSelectStart,
  getScrollElement,
  disabled = false,
}: {
  onSelectionReplace: (ids: string[]) => void
  onSelectStart: () => void
  getScrollElement?: () => HTMLElement | null
  disabled?: boolean
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const originRef = useRef<{ x: number; y: number } | null>(null)
  const activeRef = useRef(false)
  const [rect, setRect] = useState<SelectionRect | null>(null)

  const updateSelection = useCallback((nextRect: SelectionRect) => {
    const content = contentRef.current
    if (!content) return
    const scrollEl = getScrollElement?.() ?? content
    const contentBox = content.getBoundingClientRect()
    const selectedIds = [...content.querySelectorAll<HTMLElement>("[data-file-id]")]
      .filter((el) => {
        const itemBox = el.getBoundingClientRect()
        const left = itemBox.left - contentBox.left + scrollEl.scrollLeft
        const top = itemBox.top - contentBox.top + scrollEl.scrollTop
        const right = left + itemBox.width
        const bottom = top + itemBox.height
        return !(
          right < nextRect.left ||
          left > nextRect.left + nextRect.width ||
          bottom < nextRect.top ||
          top > nextRect.top + nextRect.height
        )
      })
      .map((el) => el.dataset.fileId)
      .filter((id): id is string => Boolean(id))

    onSelectionReplace(selectedIds)
  }, [getScrollElement, onSelectionReplace])

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest("[data-file-id]")) return
    const content = contentRef.current
    if (!content) return
    e.preventDefault()
    const scrollEl = getScrollElement?.() ?? content
    const box = content.getBoundingClientRect()
    const x = e.clientX - box.left + scrollEl.scrollLeft
    const y = e.clientY - box.top + scrollEl.scrollTop
    originRef.current = { x, y }
    activeRef.current = true

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeRef.current || !originRef.current || !contentRef.current) return
      const currentBox = contentRef.current.getBoundingClientRect()
      const currentScrollEl = getScrollElement?.() ?? contentRef.current
      const nextX = event.clientX - currentBox.left + currentScrollEl.scrollLeft
      const nextY = event.clientY - currentBox.top + currentScrollEl.scrollTop
      const width = Math.abs(nextX - originRef.current.x)
      const height = Math.abs(nextY - originRef.current.y)
      if (width < 4 && height < 4) return
      onSelectStart()
      const nextRect = {
        left: Math.min(originRef.current.x, nextX),
        top: Math.min(originRef.current.y, nextY),
        width,
        height,
      }
      setRect(nextRect)
      updateSelection(nextRect)
    }

    const handlePointerUp = () => {
      activeRef.current = false
      originRef.current = null
      setRect(null)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp, { once: true })
  }

  return { contentRef, rect, handlePointerDown } as const
}
