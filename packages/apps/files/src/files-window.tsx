import { useCallback, useEffect, useMemo, useRef } from "react"
import { useListChildren } from "@drivebase/data"
import { useFilesClipboardStore, useSubscribe, type AppProps } from "@drivebase/kernel"
import { LocationsSidebar } from "./components/locations-sidebar"
import { Toolbar } from "./components/toolbar"
import { Breadcrumb } from "./components/breadcrumb"
import { FilesView } from "./components/files-view"
import { InfoDialog } from "./components/info-dialog"
import { useFileSelection } from "./hooks/use-file-selection"
import { useFilesNavigation, type BreadcrumbCrumb } from "./hooks/use-files-navigation"
import { useFilesWindowState } from "./hooks/use-files-window-state"
import { useFilesWindowOperations } from "./hooks/use-files-window-operations"
import { useFilesWindowCommands } from "./hooks/use-files-window-commands"
import { useFilesWindowDnd } from "./hooks/use-files-window-dnd"
import { FilesWindowErrors } from "./files-window-errors"
import { FilesWindowOverlay } from "./files-window-overlay"
import { FilesWindowStatus } from "./files-window-status"
import { registerFilesContextMenus } from "./menus"
import type { Node, Provider } from "./files-window-types"
import type { FilesAppPayload } from "./files-app"
import type { FileItemNode } from "./components/file-item"

registerFilesContextMenus()

interface FilesWindowProps {
  windowId: string
  provider: Provider
  providers: Provider[]
  providersFetching: boolean
  onSwitchProvider: (provider: Provider) => void
  initialPath?: BreadcrumbCrumb[]
  initialView?: FilesAppPayload["view"]
  setPayload?: AppProps["setPayload"]
}

export function FilesWindow({
  windowId,
  provider,
  providers,
  providersFetching,
  onSwitchProvider,
  initialPath,
  initialView,
  setPayload,
}: FilesWindowProps) {
  const nav = useFilesNavigation(provider.label, initialPath)
  const { selection, clear, handleItemClick, replaceSelection } = useFileSelection()
  const state = useFilesWindowState({
    providerId: provider.id,
    navigationPath: nav.stack,
    currentFolderId: nav.current.id,
    initialView,
    setPayload,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { nodes, fetching, error, refetch } = useListChildren({
    providerId: provider.id,
    parentId: nav.current.id,
    force: null,
  })

  useSubscribe("files.refresh", useCallback(() => { refetch() }, [refetch]))

  useEffect(() => {
    clear()
  }, [clear, nav.current.id])

  const listedNodes = useMemo<FileItemNode[]>(() => {
    const current = nodes as Node[]
    return state.draftFolder ? [...current, state.draftFolder] : current
  }, [nodes, state.draftFolder])

  useEffect(() => {
    if (!state.draftFolder) return
    if (!(nodes as Node[]).some((node) => node.id === state.draftFolder?.id)) return
    state.setDraftFolder(null)
  }, [nodes, state.draftFolder, state.setDraftFolder])

  const filteredNodes = useMemo(() => {
    if (!state.query) return listedNodes
    const q = state.query.toLowerCase()
    return listedNodes.filter((node) => node.name.toLowerCase().includes(q))
  }, [listedNodes, state.query])

  const selectedNodes = useMemo(
    () => listedNodes.filter((node) => selection.has(node.id)),
    [listedNodes, selection],
  )

  const operations = useFilesWindowOperations({
    provider,
    currentFolderId: nav.current.id,
    navigationPath: nav.stack,
    view: state.view,
    listedNodes,
    filteredNodes,
    selectedNodes,
    selection,
    draftFolder: state.draftFolder,
    renamingId: state.renamingId,
    fileInputRef,
    clearSelection: clear,
    replaceSelection,
    pushFolder: (node) => {
      if (node.type === "folder") nav.push({ id: node.id, name: node.name })
    },
    setInfoNode: state.setInfoNode,
    setRenamingId: state.setRenamingId,
    setDraftFolder: state.setDraftFolder,
    refetch,
  })
  const clipboardNodeCount = useFilesClipboardStore((s) => s.nodeIds.length)
  const canPasteIntoCurrentFolder = operations.canPasteInto(nav.current.id)

  const busy =
    operations.deletePending ||
    operations.duplicatePending ||
    operations.copyPending ||
    operations.movePending ||
    operations.transferPending

  const actions = useMemo(() => ({
    goBack: () => nav.jumpTo(nav.stack.length - 2),
    refresh: refetch,
    upload: operations.handleUpload,
    newFolder: operations.handleNewFolder,
    openSelection: operations.handleOpenSelection,
    openSelectionInNewWindow: operations.handleOpenSelectionInNewWindow,
    copySelection: operations.handleCopySelection,
    cutSelection: operations.handleCutSelection,
    renameSelection: operations.handleRenameSelection,
    downloadSelection: operations.handleDownloadSelection,
    duplicateSelection: operations.handleDuplicateSelection,
    deleteSelection: operations.handleDeleteSelection,
    infoSelection: operations.handleInfoSelection,
    selectAll: operations.handleSelectAll,
    pasteIntoCurrentFolder: operations.handlePasteIntoCurrentFolder,
    setGridView: () => {
      state.setView("grid")
    },
    setListView: () => {
      state.setView("list")
    },
  }), [
    nav,
    refetch,
    operations.handleUpload,
    operations.handleNewFolder,
    operations.handleOpenSelection,
    operations.handleOpenSelectionInNewWindow,
    operations.handleCopySelection,
    operations.handleCutSelection,
    operations.handleRenameSelection,
    operations.handleDownloadSelection,
    operations.handleDuplicateSelection,
    operations.handleDeleteSelection,
    operations.handleInfoSelection,
    operations.handleSelectAll,
    operations.handlePasteIntoCurrentFolder,
    state.setView,
  ])

  const { commandContext } = useFilesWindowCommands({
    windowId,
    selection: selectedNodes,
    canGoBack: nav.stack.length > 1,
    view: state.view,
    busy: busy || operations.createFolderPending || operations.renamePending,
    canPaste: operations.canPasteInto(nav.current.id),
    actions,
  })

  const dnd = useFilesWindowDnd({
    windowId,
    currentFolderId: nav.current.id,
    providerId: provider.id,
    filteredNodes,
    clearWindowDragOver: state.clearWindowDragOver,
    setWindowDragOver: state.setWindowDragOver,
    moveNodes: operations.moveNodes,
    copyNodes: operations.copyNodes,
    transferNodes: operations.transferNodes,
    moveTransferNodes: operations.moveTransferNodes,
    uploadFiles: operations.uploadFilesToParent,
  })

  const errorMessages = [
    error?.graphQLErrors[0]?.message ?? error?.message,
    operations.createFolderError,
    operations.deleteError,
    operations.duplicateError,
    operations.copyError,
    operations.renameError,
    operations.uploadError,
    operations.moveError,
    operations.transferError,
  ].filter((message): message is string => Boolean(message))

  return (
    <div
      className="relative flex h-full flex-col"
      onDropCapture={state.clearWindowDragOver}
      onDragOver={dnd.handleWindowDragOver}
      onDragLeave={dnd.handleWindowDragLeave}
      onDrop={dnd.handleWindowDrop}
    >
      {state.windowDragOver ? <FilesWindowOverlay mode={dnd.isAltHeld ? "copy" : "move"} /> : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => void operations.handleFilesPicked(e.target.files)}
      />

      <Toolbar
        view={state.view}
        onViewChange={state.setView}
        query={state.query}
        onQueryChange={state.setQuery}
        onBack={actions.goBack}
        canGoBack={nav.stack.length > 1}
        onUpload={actions.upload}
        onNewFolder={actions.newFolder}
        onSync={actions.refresh}
        onCopySelection={actions.copySelection}
        onPaste={actions.pasteIntoCurrentFolder}
        onDeleteSelection={() => void actions.deleteSelection()}
        syncing={fetching}
        selectionCount={selection.size}
        canPaste={clipboardNodeCount > 0 && canPasteIntoCurrentFolder}
        clipboardCount={clipboardNodeCount}
      />
      <Breadcrumb stack={nav.stack} onJump={nav.jumpTo} />

      <div className="flex min-h-0 flex-1">
        <LocationsSidebar
          providers={providers}
          selectedProviderId={provider.id}
          onSelect={(nextProvider) => {
            if (nextProvider.id === provider.id) return
            onSwitchProvider(nextProvider)
            nav.resetRoot(nextProvider.label)
          }}
          fetching={providersFetching}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <FilesWindowErrors messages={errorMessages} />

          <FilesView
            nodes={filteredNodes}
            view={state.view}
            selection={selection}
            currentFolderId={nav.current.id}
            providerId={provider.id}
            windowId={windowId}
            onItemClick={handleItemClick}
            onItemDoubleClick={operations.handleOpen}
            onBackgroundClick={clear}
            onSelectionReplace={replaceSelection}
            renamingId={state.renamingId}
            onRenameSubmit={(value) => void operations.submitRename(value)}
            onRenameCancel={operations.cancelRename}
            onOpenNode={operations.handleOpen}
            onOpenNodeInNewWindow={operations.handleOpenInNewWindow}
            onCopyNode={operations.handleCopy}
            onCutNode={operations.handleCut}
            onPasteIntoFolder={operations.handlePasteIntoFolder}
            canPasteIntoFolder={operations.canPasteIntoFolderNode}
            onDownloadNode={operations.handleDownload}
            onRenameNode={operations.startRename}
            onDuplicateNode={operations.handleDuplicate}
            onDeleteNode={operations.handleDelete}
            onInfoNode={operations.handleInfo}
            commandContext={commandContext}
            onDropNodes={dnd.handleDropNodes}
          />

          <FilesWindowStatus
            itemCount={filteredNodes.length}
            selectionCount={selection.size}
            uploadPending={operations.uploadPending}
            uploadProgress={operations.uploadProgress}
            duplicatePending={operations.duplicatePending}
            copyPending={operations.copyPending}
            movePending={operations.movePending}
            transferPending={operations.transferPending}
            deletePending={operations.deletePending}
            fetching={fetching}
          />
        </div>
      </div>

      <InfoDialog
        open={state.infoNode !== null}
        node={state.infoNode}
        onClose={() => state.setInfoNode(null)}
      />
    </div>
  )
}
