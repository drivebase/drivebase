import type { ReactNode } from "react"
import type { ContextMenuEntry, MenuContribution } from "@drivebase/kernel"
import {
  Copy,
  Download,
  FolderOpen,
  Info,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"
import type { ViewMode } from "./components/toolbar"
import type { FileItemNode } from "./components/file-item"

export interface FilesCommandActions
  extends Record<string, () => void | Promise<void>> {
  goBack: () => void
  refresh: () => void
  upload: () => void
  newFolder: () => void
  openSelection: () => void
  openSelectionInNewWindow: () => void
  copySelection: () => void
  cutSelection: () => void
  renameSelection: () => void
  downloadSelection: () => void
  duplicateSelection: () => void
  deleteSelection: () => void
  infoSelection: () => void
  selectAll: () => void
  pasteIntoCurrentFolder: () => void
  setGridView: () => void
  setListView: () => void
}

export interface FilesCommandContext {
  selection: FileItemNode[]
  canGoBack: boolean
  view: ViewMode
  busy: boolean
  canPaste: boolean
  actions: FilesCommandActions
}

export interface FilesItemActions {
  open: () => void
  openInNewWindow: () => void
  copy: () => void
  cut: () => void
  rename: () => void
  duplicate: () => void
  download: () => void
  delete: () => void
  info: () => void
  pasteIntoFolder: () => void
  canPasteIntoFolder: boolean
}

function firstSelection(selection: FileItemNode[]): FileItemNode | null {
  return selection[0] ?? null
}

function canOpen(node: FileItemNode | null): boolean {
  return node?.type === "folder"
}

function canDownload(node: FileItemNode | null): boolean {
  return node?.type === "file"
}

function commandState(ctx: FilesCommandContext) {
  const selected = firstSelection(ctx.selection)
  const single = ctx.selection.length === 1 ? selected : null
  const hasSelection = ctx.selection.length > 0

  return {
    selected,
    hasSelection,
    canOpen: !ctx.busy && canOpen(single),
    canOpenInNewWindow: !ctx.busy && canOpen(single),
    canRename: !ctx.busy && single !== null,
    canDownload: !ctx.busy && canDownload(single),
    canDuplicate: !ctx.busy && hasSelection,
    canDelete: !ctx.busy && hasSelection,
    canInfo: single !== null,
    canCopy: hasSelection,
    canCut: hasSelection,
    canPaste: !ctx.busy && ctx.canPaste,
    canSelectAll: true,
  }
}

export function buildFilesWindowMenus(ctx: FilesCommandContext): MenuContribution[] {
  const state = commandState(ctx)

  return [
    {
      id: "file",
      label: "File",
      items: [
        {
          id: "new-folder",
          label: "New Folder",
          shortcut: "⇧⌘N",
          disabled: ctx.busy,
          commandId: "newFolder",
        },
        { id: "separator-open", separator: true },
        {
          id: "open",
          label: "Open",
          shortcut: "⌘O",
          disabled: !state.canOpen,
          commandId: "openSelection",
        },
        {
          id: "open-new-window",
          label: "Open in New Window",
          shortcut: "⌘↩",
          disabled: !state.canOpenInNewWindow,
          commandId: "openSelectionInNewWindow",
        },
        { id: "separator-rename", separator: true },
        {
          id: "rename",
          label: "Rename",
          shortcut: "↩",
          disabled: !state.canRename,
          commandId: "renameSelection",
        },
        {
          id: "duplicate",
          label: "Duplicate",
          shortcut: "⌘D",
          disabled: !state.canDuplicate,
          commandId: "duplicateSelection",
        },
        {
          id: "download",
          label: "Download",
          disabled: !state.canDownload,
          commandId: "downloadSelection",
        },
        {
          id: "move-to-trash",
          label: "Move to Trash",
          shortcut: "⌘⌫",
          disabled: !state.canDelete,
          commandId: "deleteSelection",
        },
        { id: "separator-info", separator: true },
        {
          id: "get-info",
          label: "Get Info",
          shortcut: "⌘I",
          disabled: !state.canInfo,
          commandId: "infoSelection",
        },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        {
          id: "cut",
          label: "Cut",
          shortcut: "⌘X",
          disabled: !state.canCut,
          commandId: "cutSelection",
        },
        {
          id: "copy",
          label: "Copy",
          shortcut: "⌘C",
          disabled: !state.canCopy,
          commandId: "copySelection",
        },
        {
          id: "paste",
          label: "Paste",
          shortcut: "⌘V",
          disabled: !state.canPaste,
          commandId: "pasteIntoCurrentFolder",
        },
        { id: "separator-select", separator: true },
        {
          id: "select-all",
          label: "Select All",
          shortcut: "⌘A",
          disabled: !state.canSelectAll,
          commandId: "selectAll",
        },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        {
          id: "as",
          label: "As",
          items: [
            {
              id: "as-icons",
              label: "Icons",
              disabled: ctx.view === "grid",
              commandId: "setGridView",
            },
            {
              id: "as-list",
              label: "List",
              disabled: ctx.view === "list",
              commandId: "setListView",
            },
          ],
        },
        { id: "separator-refresh", separator: true },
        {
          id: "refresh",
          label: "Refresh",
          shortcut: "⌘R",
          disabled: ctx.busy,
          commandId: "refresh",
        },
      ],
    },
    {
      id: "go",
      label: "Go",
      items: [
        {
          id: "back",
          label: "Back",
          shortcut: "⌘[",
          disabled: !ctx.canGoBack,
          commandId: "goBack",
        },
        { id: "forward", label: "Forward", shortcut: "⌘]", disabled: true },
        { id: "up", label: "Up", shortcut: "⌘↑", disabled: true },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { id: "files-help", label: "Files Help", disabled: true },
        { id: "keyboard-shortcuts", label: "Keyboard Shortcuts", disabled: true },
      ],
    },
  ]
}

function entry(
  id: string,
  label: string,
  icon: ReactNode,
  onSelect: () => void,
  opts?: { shortcut?: string; disabled?: boolean; destructive?: boolean },
): ContextMenuEntry {
  return {
    id,
    label,
    icon,
    onSelect,
    shortcut: opts?.shortcut,
    disabled: opts?.disabled,
    destructive: opts?.destructive,
  }
}

export function buildFilesItemContextMenu(
  node: FileItemNode,
  ctx: FilesCommandContext,
  actions: FilesItemActions,
): ContextMenuEntry[] {
  const state = commandState({
    ...ctx,
    selection:
      ctx.selection.length > 0 && ctx.selection.some((selected) => selected.id === node.id)
        ? ctx.selection
        : [node],
  })

  const entries: ContextMenuEntry[] = [
    entry("open", "Open", <FolderOpen size={14} />, actions.open, {
      disabled: !state.canOpen,
    }),
    entry("open-new-window", "Open in New Window", <FolderOpen size={14} />, actions.openInNewWindow, {
      shortcut: "⌘↩",
      disabled: !state.canOpenInNewWindow,
    }),
    { id: "sep-open", separator: true },
    entry("copy", "Copy", <Copy size={14} />, actions.copy, {
      shortcut: "⌘C",
      disabled: !state.canCopy,
    }),
    entry("cut", "Cut", <Copy size={14} />, actions.cut, {
      shortcut: "⌘X",
      disabled: !state.canCut,
    }),
  ]

  if (node.type === "folder") {
    entries.push(
      entry("paste", "Paste", <Copy size={14} />, actions.pasteIntoFolder, {
        shortcut: "⌘V",
        disabled: !actions.canPasteIntoFolder,
      }),
    )
  }

  entries.push(
    { id: "sep-edit", separator: true },
    entry("rename", "Rename", <Pencil size={14} />, actions.rename, {
      shortcut: "↩",
      disabled: !state.canRename,
    }),
    entry("duplicate", "Duplicate", <Copy size={14} />, actions.duplicate, {
      shortcut: "⌘D",
      disabled: !state.canDuplicate,
    }),
    entry("download", "Download", <Download size={14} />, actions.download, {
      disabled: !state.canDownload,
    }),
    { id: "sep-1", separator: true },
    entry("info", "Get info", <Info size={14} />, actions.info, {
      disabled: !state.canInfo,
    }),
    { id: "sep-2", separator: true },
    entry("delete", "Delete", <Trash2 size={14} />, actions.delete, {
      shortcut: "⌘⌫",
      destructive: true,
      disabled: !state.canDelete,
    }),
  )

  return entries
}

export function buildFilesBackgroundContextMenu(
  ctx: Pick<FilesCommandContext, "busy" | "actions" | "canPaste">,
): ContextMenuEntry[] {
  return [
    entry("new-folder", "New Folder", <FolderOpen size={14} />, ctx.actions.newFolder, {
      shortcut: "⇧⌘N",
      disabled: ctx.busy,
    }),
    { id: "sep-new-folder", separator: true },
    entry("paste", "Paste", <Copy size={14} />, ctx.actions.pasteIntoCurrentFolder, {
      shortcut: "⌘V",
      disabled: ctx.busy || !ctx.canPaste,
    }),
    { id: "sep-clipboard", separator: true },
    entry("refresh", "Refresh", <RefreshCw size={14} />, ctx.actions.refresh, {
      shortcut: "⌘R",
      disabled: ctx.busy,
    }),
    { id: "sep-1", separator: true },
    entry("upload", "Upload…", <Upload size={14} />, ctx.actions.upload),
  ]
}
