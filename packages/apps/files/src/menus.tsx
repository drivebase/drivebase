import {
  registerContextMenu,
  type ContextMenuEntry,
} from "@drivebase/kernel"
import type { FileItemNode } from "./components/file-item"
import {
  buildFilesBackgroundContextMenu,
  buildFilesItemContextMenu,
  type FilesCommandContext,
  type FilesItemActions,
} from "./file-commands"

const filesMenuRegistry = globalThis as typeof globalThis & {
  __drivebaseFilesMenusCleanup__?: () => void
}

export interface FilesItemMenuPayload {
  node: FileItemNode
  commandContext: FilesCommandContext
  nodeActions: FilesItemActions
}

export interface FilesBackgroundMenuPayload {
  commandContext: Pick<FilesCommandContext, "busy" | "actions" | "canPaste">
}

let registered = false
export function registerFilesContextMenus(): void {
  if (registered) return
  filesMenuRegistry.__drivebaseFilesMenusCleanup__?.()
  registered = true

  const unregisterItem = registerContextMenu<FilesItemMenuPayload>("files.item", (payload) =>
    buildFilesItemContextMenu(payload.node, payload.commandContext, payload.nodeActions),
  )

  const unregisterBackground = registerContextMenu<FilesBackgroundMenuPayload>(
    "files.background",
    (payload): ContextMenuEntry[] =>
      buildFilesBackgroundContextMenu(payload.commandContext),
  )

  const cleanup = () => {
    unregisterItem()
    unregisterBackground()
    if (filesMenuRegistry.__drivebaseFilesMenusCleanup__ === cleanup) {
      filesMenuRegistry.__drivebaseFilesMenusCleanup__ = undefined
    }
    registered = false
  }

  filesMenuRegistry.__drivebaseFilesMenusCleanup__ = cleanup

  ;(
    import.meta as ImportMeta & {
      hot?: {
        dispose(cb: () => void): void
      }
    }
  ).hot?.dispose(cleanup)
}
