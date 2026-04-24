import { useCallback, useEffect, useMemo, useState } from "react"
import type { ViewMode } from "../components/toolbar"
import type { FileItemNode } from "../components/file-item"
import type { FilesAppPayload } from "../files-app"
import type { DraftFolderNode } from "../files-window-types"
import type { BreadcrumbCrumb } from "./use-files-navigation"

export interface UseFilesWindowStateParams {
  providerId: string
  navigationPath: BreadcrumbCrumb[]
  currentFolderId: string | null
  initialView?: ViewMode
  setPayload?: (payload: unknown) => void
}

export interface UseFilesWindowStateResult {
  view: ViewMode
  setView: React.Dispatch<React.SetStateAction<ViewMode>>
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  infoNode: FileItemNode | null
  setInfoNode: React.Dispatch<React.SetStateAction<FileItemNode | null>>
  renamingId: string | null
  setRenamingId: React.Dispatch<React.SetStateAction<string | null>>
  draftFolder: DraftFolderNode | null
  setDraftFolder: React.Dispatch<React.SetStateAction<DraftFolderNode | null>>
  windowDragOver: boolean
  setWindowDragOver: React.Dispatch<React.SetStateAction<boolean>>
  clearWindowDragOver: () => void
}

export function useFilesWindowState({
  providerId,
  navigationPath,
  currentFolderId,
  initialView,
  setPayload,
}: UseFilesWindowStateParams): UseFilesWindowStateResult {
  const [view, setView] = useState<ViewMode>(initialView ?? "grid")
  const [query, setQuery] = useState("")
  const [infoNode, setInfoNode] = useState<FileItemNode | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftFolder, setDraftFolder] = useState<DraftFolderNode | null>(null)
  const [windowDragOver, setWindowDragOver] = useState(false)

  const clearWindowDragOver = useCallback(() => {
    setWindowDragOver(false)
  }, [])

  useEffect(() => {
    setQuery("")
    setDraftFolder(null)
    setRenamingId(null)
  }, [currentFolderId])

  const persistedPayload = useMemo<FilesAppPayload>(() => ({
    providerId,
    path: navigationPath,
    view,
  }), [providerId, navigationPath, view])

  useEffect(() => {
    if (!setPayload) return
    setPayload(persistedPayload)
  }, [persistedPayload, setPayload])

  return {
    view,
    setView,
    query,
    setQuery,
    infoNode,
    setInfoNode,
    renamingId,
    setRenamingId,
    draftFolder,
    setDraftFolder,
    windowDragOver,
    setWindowDragOver,
    clearWindowDragOver,
  }
}
