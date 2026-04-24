import { useCallback, useEffect, useState, type DragEvent } from "react"
import { DND_MIME, activeDragWindowId } from "./use-node-dnd"
import type { FileItemNode } from "../components/file-item"

export interface UseFilesWindowDndParams {
  windowId: string
  currentFolderId: string | null
  providerId: string
  filteredNodes: FileItemNode[]
  clearWindowDragOver: () => void
  setWindowDragOver: React.Dispatch<React.SetStateAction<boolean>>
  moveNodes: (nodeIds: string[], dstParentId: string | null) => Promise<unknown>
  copyNodes: (nodeIds: string[], dstParentId: string | null) => Promise<unknown>
  transferNodes: (
    srcNodeIds: string[],
    dstProviderId: string,
    dstParentId: string | null,
  ) => Promise<unknown>
  moveTransferNodes: (
    srcNodeIds: string[],
    dstProviderId: string,
    dstParentId: string | null,
  ) => Promise<unknown>
  uploadFiles: (
    filesInput: FileList | File[],
    dstParentId: string | null,
  ) => Promise<unknown>
}

export interface UseFilesWindowDndResult {
  handleDropNodes: (
    nodeIds: string[],
    sourceProviderId: string,
    dstParentId: string | null,
    altKey: boolean,
  ) => void
  handleWindowDragOver: (e: DragEvent<HTMLDivElement>) => void
  handleWindowDragLeave: (e: DragEvent<HTMLDivElement>) => void
  handleWindowDrop: (e: DragEvent<HTMLDivElement>) => void
  isAltHeld: boolean
}

export function useFilesWindowDnd({
  windowId,
  currentFolderId,
  providerId,
  filteredNodes,
  clearWindowDragOver,
  setWindowDragOver,
  moveNodes,
  copyNodes,
  transferNodes,
  moveTransferNodes,
  uploadFiles,
}: UseFilesWindowDndParams): UseFilesWindowDndResult {
  const [isAltHeld, setIsAltHeld] = useState(false)

  const resolveDropTarget = useCallback((target: EventTarget | null) => {
    const targetEl = (target as HTMLElement | null)?.closest("[data-file-id]")
    const targetId = targetEl?.getAttribute("data-file-id") ?? null
    const targetNode = targetId
      ? filteredNodes.find((node) => node.id === targetId)
      : null

    return targetNode?.type === "folder" ? targetNode.id : null
  }, [filteredNodes])

  const handleDropNodes = useCallback(
    (nodeIds: string[], sourceProviderId: string, dstParentId: string | null, altKey: boolean) => {
      const target = dstParentId ?? currentFolderId
      if (sourceProviderId === providerId) {
        // Same provider: alt → copy, default → move
        if (altKey) {
          void copyNodes(nodeIds, target)
        } else {
          void moveNodes(nodeIds, target)
        }
        return
      }
      // Cross-provider: alt → copy only, default → move (transfer then delete source)
      if (altKey) {
        void transferNodes(nodeIds, providerId, target)
      } else {
        void moveTransferNodes(nodeIds, providerId, target)
      }
    },
    [currentFolderId, copyNodes, moveNodes, providerId, transferNodes, moveTransferNodes],
  )

  const handleDropFiles = useCallback(
    (files: FileList | File[], dstParentId: string | null) => {
      const droppedFiles = files instanceof FileList ? Array.from(files) : files
      if (droppedFiles.length === 0) return
      const target = dstParentId ?? currentFolderId
      void uploadFiles(droppedFiles, target)
    },
    [currentFolderId, uploadFiles],
  )

  const handleWindowDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    const isCrossWindowNodeDrag =
      e.dataTransfer.types.includes(DND_MIME) &&
      activeDragWindowId !== null &&
      activeDragWindowId !== windowId
    const isExternalFileDrag = e.dataTransfer.types.includes("Files")

    if (isCrossWindowNodeDrag || isExternalFileDrag) {
      e.preventDefault()
      e.dataTransfer.dropEffect = isExternalFileDrag ? "copy" : (e.altKey ? "copy" : "move")
      setWindowDragOver(true)
      if (isCrossWindowNodeDrag) setIsAltHeld(e.altKey)
    }
  }, [setWindowDragOver, windowId])

  const handleWindowDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Element | null)) {
      setWindowDragOver(false)
      setIsAltHeld(false)
    }
  }, [setWindowDragOver])

  const handleWindowDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      clearWindowDragOver()
      setIsAltHeld(false)
      if (e.dataTransfer.files.length > 0) {
        e.preventDefault()
        handleDropFiles(e.dataTransfer.files, resolveDropTarget(e.target))
        return
      }

      const raw = e.dataTransfer.getData(DND_MIME)
      if (!raw) return
      try {
        const payload = JSON.parse(raw) as {
          nodeIds: string[]
          sourceProviderId: string
          sourceWindowId: string
        }
        if (payload.sourceWindowId === windowId) return
        e.preventDefault()
        handleDropNodes(
          payload.nodeIds,
          payload.sourceProviderId,
          resolveDropTarget(e.target),
          e.altKey,
        )
      } catch {
        // ignore
      }
    },
    [clearWindowDragOver, handleDropFiles, handleDropNodes, resolveDropTarget, windowId],
  )

  useEffect(() => {
    const clear = () => {
      clearWindowDragOver()
      setIsAltHeld(false)
    }
    window.addEventListener("drop", clear)
    window.addEventListener("dragend", clear)
    return () => {
      window.removeEventListener("drop", clear)
      window.removeEventListener("dragend", clear)
    }
  }, [clearWindowDragOver])

  return {
    handleDropNodes,
    handleWindowDragOver,
    handleWindowDragLeave,
    handleWindowDrop,
    isAltHeld,
  }
}
