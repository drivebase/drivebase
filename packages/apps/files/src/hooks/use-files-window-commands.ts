import { useEffect, useMemo } from "react"
import { useWindowCommandStore, useWindowMenuStore } from "@drivebase/kernel"
import {
  buildFilesWindowMenus,
  type FilesCommandActions,
  type FilesCommandContext,
} from "../file-commands"
import type { ViewMode } from "../components/toolbar"
import type { FileItemNode } from "../components/file-item"

export interface UseFilesWindowCommandsParams {
  windowId: string
  selection: FileItemNode[]
  canGoBack: boolean
  view: ViewMode
  busy: boolean
  canPaste: boolean
  actions: FilesCommandActions
}

export interface UseFilesWindowCommandsResult {
  commandContext: FilesCommandContext
}

export function useFilesWindowCommands({
  windowId,
  selection,
  canGoBack,
  view,
  busy,
  canPaste,
  actions,
}: UseFilesWindowCommandsParams): UseFilesWindowCommandsResult {
  const setWindowMenus = useWindowMenuStore((s) => s.setMenus)
  const clearWindowMenus = useWindowMenuStore((s) => s.clearMenus)
  const setWindowCommands = useWindowCommandStore((s) => s.setCommands)
  const clearWindowCommands = useWindowCommandStore((s) => s.clearCommands)

  const commandContext = useMemo<FilesCommandContext>(() => ({
    selection,
    canGoBack,
    view,
    busy,
    canPaste,
    actions,
  }), [actions, busy, canGoBack, canPaste, selection, view])

  const windowMenus = useMemo(
    () => buildFilesWindowMenus(commandContext),
    [commandContext],
  )

  useEffect(() => {
    setWindowMenus(windowId, windowMenus)
  }, [setWindowMenus, windowId, windowMenus])

  useEffect(() => {
    setWindowCommands(windowId, actions)
  }, [actions, setWindowCommands, windowId])

  useEffect(() => {
    return () => {
      clearWindowMenus(windowId)
      clearWindowCommands(windowId)
    }
  }, [clearWindowCommands, clearWindowMenus, windowId])

  return { commandContext }
}
