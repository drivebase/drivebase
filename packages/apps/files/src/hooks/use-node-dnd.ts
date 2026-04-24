import { useCallback, useState } from "react"
import type { DragEvent } from "react"

export const DND_MIME = "application/x-drivebase-node+json"

/**
 * The windowId of the window that started the current drag. Set on dragstart,
 * cleared on dragend. Readable in dragover handlers (unlike dataTransfer data
 * which is write-only mid-drag for security reasons).
 */
export let activeDragWindowId: string | null = null

export interface DndPayload {
  nodeIds: string[]
  sourceProviderId: string
  sourceWindowId: string
  sourceParentId: string | null
}

/**
 * Manages file drag-and-drop state for the Files view. Dragging a selected
 * item carries all selected IDs; dragging an unselected item carries only
 * that item. The dragged items dim to 0.4 opacity (matching the OS aesthetic)
 * and the hovered drop-target folder shows an accent outline.
 */
export function useNodeDnd({
  providerId,
  windowId,
  currentFolderId,
  nodesById,
  selection,
  onDrop,
}: {
  providerId: string
  windowId: string
  currentFolderId: string | null
  nodesById: Map<string, { id: string; type: "file" | "folder" }>
  selection: Set<string>
  onDrop: (nodeIds: string[], sourceProviderId: string, dstParentId: string | null, altKey: boolean) => void
}) {
  const [draggingIds, setDraggingIds] = useState<Set<string>>(new Set())
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragLeadId, setDragLeadId] = useState<string | null>(null)

  const handleDragStart = useCallback(
    (e: DragEvent, nodeId: string) => {
      const ids = selection.has(nodeId) ? [...selection] : [nodeId]
      const payload: DndPayload = {
        nodeIds: ids,
        sourceProviderId: providerId,
        sourceWindowId: windowId,
        sourceParentId: currentFolderId,
      }
      e.dataTransfer.effectAllowed = "copyMove"
      e.dataTransfer.setData(DND_MIME, JSON.stringify(payload))
      activeDragWindowId = windowId
      setDraggingIds(new Set(ids))
      setDragLeadId(nodeId)
    },
    [providerId, windowId, currentFolderId, selection],
  )

  const handleDragEnd = useCallback(() => {
    activeDragWindowId = null
    setDraggingIds(new Set())
    setDragLeadId(null)
    setDragOverId(null)
  }, [])

  const handleFolderDragOver = useCallback(
    (e: DragEvent, folderId: string) => {
      if (!e.dataTransfer.types.includes(DND_MIME)) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = e.altKey ? "copy" : "move"
      setDragOverId(folderId)
    },
    [],
  )

  const handleFolderDragLeave = useCallback(
    (e: DragEvent, folderId: string) => {
      e.stopPropagation()
      setDragOverId((prev) => (prev === folderId ? null : prev))
    },
    [],
  )

  const handleFolderDrop = useCallback(
    (e: DragEvent, folderId: string) => {
      const raw = e.dataTransfer.getData(DND_MIME)
      if (!raw) return
      e.preventDefault()
      e.stopPropagation()
      setDragOverId(null)
      setDraggingIds(new Set())
      setDragLeadId(null)
      let payload: DndPayload
      try {
        payload = JSON.parse(raw) as DndPayload
      } catch {
        return
      }
      const filtered = payload.nodeIds.filter((id) => id !== folderId)
      if (filtered.length === 0) return
      onDrop(filtered, payload.sourceProviderId, folderId, e.altKey)
    },
    [onDrop],
  )

  const handleBackgroundDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes(DND_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = e.altKey ? "copy" : "move"
    setDragOverId("__background__")
  }, [])

  const handleBackgroundDragLeave = useCallback(() => {
    setDragOverId((prev) => (prev === "__background__" ? null : prev))
  }, [])

  const handleBackgroundDrop = useCallback(
    (e: DragEvent) => {
      const raw = e.dataTransfer.getData(DND_MIME)
      if (!raw) return
      let payload: DndPayload
      try {
        payload = JSON.parse(raw) as DndPayload
      } catch {
        return
      }
      const targetEl = (e.target as HTMLElement | null)?.closest("[data-file-id]")
      const targetId = targetEl?.getAttribute("data-file-id") ?? null
      const targetNode = targetId ? nodesById.get(targetId) : null
      const targetFolderId = targetNode?.type === "folder" ? targetNode.id : null
      if (
        payload.sourceProviderId === providerId &&
        payload.sourceParentId === (targetFolderId ?? currentFolderId)
      ) {
        setDragOverId(null)
        setDraggingIds(new Set())
        setDragLeadId(null)
        return
      }
      e.preventDefault()
      e.stopPropagation()
      setDragOverId(null)
      setDraggingIds(new Set())
      setDragLeadId(null)
      onDrop(payload.nodeIds, payload.sourceProviderId, targetFolderId, e.altKey)
    },
    [currentFolderId, nodesById, onDrop, providerId],
  )

  return {
    draggingIds,
    dragLeadId,
    dragOverId,
    handleDragStart,
    handleDragEnd,
    handleFolderDragOver,
    handleFolderDragLeave,
    handleFolderDrop,
    handleBackgroundDragOver,
    handleBackgroundDragLeave,
    handleBackgroundDrop,
  }
}
