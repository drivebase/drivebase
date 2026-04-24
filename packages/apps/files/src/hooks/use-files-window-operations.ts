import { useCallback, useRef, type RefObject } from "react"
import { useCreateFolder, useRenameNode } from "@drivebase/data"
import { askConfirm } from "@drivebase/ui/hooks/ask-confirm"
import { useBus, useFilesClipboardStore } from "@drivebase/kernel"
import { useDeleteNodes } from "./use-delete-node"
import { useDuplicateNodes } from "./use-duplicate-node"
import { useCopyNodes } from "./use-copy-nodes"
import { useUploadFiles } from "./use-upload-files"
import { useMoveNodes } from "./use-move-node"
import { useTransferNodes } from "./use-transfer-nodes"
import { useDownloadNode } from "./use-download-node"
import { nextFolderName } from "../files-app-utils"
import type { FileItemNode } from "../components/file-item"
import type { ViewMode } from "../components/toolbar"
import type { FilesAppPayload } from "../files-app"
import type { DraftFolderNode, Provider } from "../files-window-types"
import type { BreadcrumbCrumb } from "./use-files-navigation"

interface ClipboardSnapshot {
  mode: ReturnType<typeof useFilesClipboardStore.getState>["mode"]
  nodeIds: string[]
  sourceProviderId: string | null
  sourceParentId: string | null
}

export interface UseFilesWindowOperationsParams {
  provider: Provider
  currentFolderId: string | null
  navigationPath: BreadcrumbCrumb[]
  view: ViewMode
  listedNodes: FileItemNode[]
  filteredNodes: FileItemNode[]
  selectedNodes: FileItemNode[]
  selection: Set<string>
  draftFolder: DraftFolderNode | null
  renamingId: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  clearSelection: () => void
  replaceSelection: (ids: string[]) => void
  pushFolder: (node: FileItemNode) => void
  setInfoNode: (node: FileItemNode | null) => void
  setRenamingId: (id: string | null) => void
  setDraftFolder: React.Dispatch<React.SetStateAction<DraftFolderNode | null>>
  refetch: () => void
}

export interface UseFilesWindowOperationsResult {
  handleOpen: (node: FileItemNode) => void
  handleOpenSelection: () => void
  handleOpenSelectionInNewWindow: () => void
  handleOpenInNewWindow: (node: FileItemNode) => void
  handleDelete: (node: FileItemNode) => Promise<void>
  handleDuplicate: (node: FileItemNode) => Promise<void>
  handleInfo: (node: FileItemNode) => void
  handleInfoSelection: () => void
  handleDownload: (node: FileItemNode) => void
  handleDownloadSelection: () => void
  startRename: (node: FileItemNode) => void
  handleRenameSelection: () => void
  cancelRename: () => void
  submitRename: (nextNameRaw: string) => Promise<void>
  handleUpload: () => void
  handleNewFolder: () => void
  handleCopy: (node: FileItemNode) => void
  handleCut: (node: FileItemNode) => void
  canPasteInto: (dstParentId: string | null) => boolean
  pasteInto: (dstParentId: string | null) => Promise<void>
  handlePasteIntoFolder: (node: FileItemNode) => void
  canPasteIntoFolderNode: (node: FileItemNode) => boolean
  handleCopySelection: () => void
  handleCutSelection: () => void
  handlePasteIntoCurrentFolder: () => void
  handleDuplicateSelection: () => Promise<void>
  handleDeleteSelection: () => Promise<void>
  handleSelectAll: () => void
  handleFilesPicked: (fileList: FileList | null) => Promise<void>
  uploadFilesToParent: (
    filesInput: FileList | File[],
    dstParentId: string | null,
  ) => Promise<void>
  deletePending: boolean
  deleteError: string | null
  duplicatePending: boolean
  duplicateError: string | null
  copyPending: boolean
  copyError: string | null
  createFolderPending: boolean
  createFolderError: string | undefined
  renamePending: boolean
  renameError: string | undefined
  uploadPending: boolean
  uploadProgress: ReturnType<typeof useUploadFiles>["progress"]
  uploadError: string | null
  moveNodes: ReturnType<typeof useMoveNodes>["moveNodes"]
  movePending: boolean
  moveError: string | null
  copyNodes: ReturnType<typeof useCopyNodes>["copyNodes"]
  transferNodes: ReturnType<typeof useTransferNodes>["transferNodes"]
  moveTransferNodes: (srcNodeIds: string[], dstProviderId: string, dstParentId: string | null) => Promise<unknown>
  transferPending: boolean
  transferError: string | null
}

export function useFilesWindowOperations({
  provider,
  currentFolderId,
  navigationPath,
  view,
  listedNodes,
  filteredNodes,
  selectedNodes,
  selection,
  draftFolder,
  renamingId,
  fileInputRef,
  clearSelection,
  replaceSelection,
  pushFolder,
  setInfoNode,
  setRenamingId,
  setDraftFolder,
  refetch,
}: UseFilesWindowOperationsParams): UseFilesWindowOperationsResult {
  const bus = useBus()
  const clipboardMode = useFilesClipboardStore((s) => s.mode)
  const clipboardNodeIds = useFilesClipboardStore((s) => s.nodeIds)
  const clipboardSourceProviderId = useFilesClipboardStore((s) => s.sourceProviderId)
  const clipboardSourceParentId = useFilesClipboardStore((s) => s.sourceParentId)
  const setClipboard = useFilesClipboardStore((s) => s.setClipboard)
  const clearClipboard = useFilesClipboardStore((s) => s.clearClipboard)
  const clipboardRef = useRef<ClipboardSnapshot>({
    mode: clipboardMode,
    nodeIds: clipboardNodeIds,
    sourceProviderId: clipboardSourceProviderId,
    sourceParentId: clipboardSourceParentId,
  })
  clipboardRef.current = {
    mode: clipboardMode,
    nodeIds: clipboardNodeIds,
    sourceProviderId: clipboardSourceProviderId,
    sourceParentId: clipboardSourceParentId,
  }

  const handlePasteOperationComplete = useCallback(() => {
    refetch()
    clearClipboard()
  }, [clearClipboard, refetch])

  const handleTransferComplete = useCallback(() => {
    refetch()
    bus.emit("files.refresh", undefined)
  }, [bus, refetch])

  const { deleteNodes, pending: deletePending, error: deleteError } = useDeleteNodes(refetch)
  const { duplicateNodes, pending: duplicatePending, error: duplicateError } = useDuplicateNodes(refetch)
  const { copyNodes, pending: copyPending, error: copyError } = useCopyNodes(handlePasteOperationComplete)
  const [{ fetching: createFolderPending, error: createFolderError }, createFolder] = useCreateFolder()
  const [{ fetching: renamePending, error: renameError }, renameNode] = useRenameNode()
  const downloadNode = useDownloadNode()
  const {
    upload,
    pending: uploadPending,
    progress: uploadProgress,
    error: uploadError,
  } = useUploadFiles({
    providerId: provider.id,
    defaultParentId: currentFolderId,
    onComplete: refetch,
  })
  const { moveNodes, pending: movePending, error: moveError } = useMoveNodes(refetch)
  const { transferNodes, pending: transferPending, error: transferError } = useTransferNodes(handleTransferComplete)
  const moveTransferNodes = useCallback(
    (srcNodeIds: string[], dstProviderId: string, dstParentId: string | null) =>
      transferNodes(srcNodeIds, dstProviderId, dstParentId, true),
    [transferNodes],
  )

  const singleSelectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null

  const targetIdsForNode = useCallback(
    (node: FileItemNode) => (selection.has(node.id) ? [...selection] : [node.id]),
    [selection],
  )

  const buildWindowPayload = useCallback((node: FileItemNode): FilesAppPayload => ({
    providerId: provider.id,
    path: [...navigationPath, { id: node.id, name: node.name }],
    view,
  }), [navigationPath, provider.id, view])

  const handleOpen = useCallback((node: FileItemNode) => {
    if (node.type === "folder") pushFolder(node)
  }, [pushFolder])

  const handleOpenSelection = useCallback(() => {
    if (!singleSelectedNode || singleSelectedNode.type !== "folder") return
    handleOpen(singleSelectedNode)
  }, [handleOpen, singleSelectedNode])

  const handleOpenSelectionInNewWindow = useCallback(() => {
    if (!singleSelectedNode || singleSelectedNode.type !== "folder") return
    bus.emit("app.launch", { appId: "files", payload: buildWindowPayload(singleSelectedNode) })
  }, [buildWindowPayload, bus, singleSelectedNode])

  const handleOpenInNewWindow = useCallback((node: FileItemNode) => {
    if (node.type !== "folder") return
    bus.emit("app.launch", { appId: "files", payload: buildWindowPayload(node) })
  }, [buildWindowPayload, bus])

  const handleDelete = useCallback(
    async (node: FileItemNode) => {
      const ids = targetIdsForNode(node)
      const label = ids.length === 1 ? `"${node.name}"` : `${ids.length} items`
      const ok = await askConfirm(`Delete ${label}?`, "This cannot be undone.", {
        confirmLabel: "Delete",
        tone: "danger",
      })
      if (!ok) return
      await deleteNodes(ids)
    },
    [deleteNodes, targetIdsForNode],
  )

  const handleDuplicate = useCallback(
    async (node: FileItemNode) => {
      await duplicateNodes(targetIdsForNode(node), currentFolderId)
    },
    [currentFolderId, duplicateNodes, targetIdsForNode],
  )

  const handleInfo = useCallback((node: FileItemNode) => {
    setInfoNode(node)
  }, [setInfoNode])

  const handleInfoSelection = useCallback(() => {
    if (!singleSelectedNode) return
    handleInfo(singleSelectedNode)
  }, [handleInfo, singleSelectedNode])

  const handleDownload = useCallback((node: FileItemNode) => {
    if (node.type !== "file") return
    downloadNode(node.id)
  }, [downloadNode])

  const handleDownloadSelection = useCallback(() => {
    if (!singleSelectedNode || singleSelectedNode.type !== "file") return
    handleDownload(singleSelectedNode)
  }, [handleDownload, singleSelectedNode])

  const startRename = useCallback((node: FileItemNode) => {
    setRenamingId(node.id)
  }, [setRenamingId])

  const handleRenameSelection = useCallback(() => {
    if (!singleSelectedNode) return
    startRename(singleSelectedNode)
  }, [singleSelectedNode, startRename])

  const cancelRename = useCallback(() => {
    if (draftFolder && renamingId === draftFolder.id) {
      setDraftFolder(null)
      clearSelection()
    }
    setRenamingId(null)
  }, [clearSelection, draftFolder, renamingId, setDraftFolder, setRenamingId])

  const submitRename = useCallback(async (nextNameRaw: string) => {
    if (!renamingId) return
    const nextName = nextNameRaw.trim()
    if (draftFolder && renamingId === draftFolder.id) {
      if (draftFolder.creating) return
      const finalName = nextName || draftFolder.name
      setDraftFolder((current) => (
        current ? { ...current, name: finalName, creating: true } : current
      ))
      setRenamingId(null)
      const result = await createFolder({
        providerId: provider.id,
        parentId: currentFolderId,
        name: finalName,
      })
      const created = result.data?.createFolder
      if (!result.error && created) {
        setDraftFolder((current) => (
          current
            ? {
                ...current,
                id: created.id,
                name: created.name,
                creating: false,
              }
            : current
        ))
        clearSelection()
        replaceSelection([created.id])
        refetch()
      } else {
        setDraftFolder((current) => (
          current ? { ...current, creating: false } : current
        ))
        setRenamingId(draftFolder.id)
      }
      return
    }
    const current = filteredNodes.find((node) => node.id === renamingId)
    if (!current || !nextName || nextName === current.name) {
      cancelRename()
      return
    }
    const result = await renameNode({ nodeId: renamingId, newName: nextName })
    if (!result.error) {
      cancelRename()
      refetch()
    }
  }, [
    cancelRename,
    clearSelection,
    createFolder,
    currentFolderId,
    draftFolder,
    filteredNodes,
    provider.id,
    refetch,
    renameNode,
    renamingId,
    replaceSelection,
    setDraftFolder,
    setRenamingId,
  ])

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [fileInputRef])

  const handleNewFolder = useCallback(() => {
    if (draftFolder) return
    const nextName = nextFolderName(listedNodes.map((node) => node.name))
    const nextDraft: DraftFolderNode = {
      id: `draft-folder:${crypto.randomUUID()}`,
      name: nextName,
      type: "folder",
      draft: true,
      size: null,
      remoteUpdatedAt: null,
    }
    setDraftFolder(nextDraft)
    clearSelection()
    replaceSelection([nextDraft.id])
    setRenamingId(nextDraft.id)
  }, [clearSelection, draftFolder, listedNodes, replaceSelection, setDraftFolder, setRenamingId])

  const setClipboardFromNode = useCallback((node: FileItemNode, mode: "copy" | "cut") => {
    setClipboard({
      mode,
      nodeIds: targetIdsForNode(node),
      sourceProviderId: provider.id,
      sourceParentId: currentFolderId,
    })
  }, [currentFolderId, provider.id, setClipboard, targetIdsForNode])

  const handleCopy = useCallback((node: FileItemNode) => {
    setClipboardFromNode(node, "copy")
  }, [setClipboardFromNode])

  const handleCut = useCallback((node: FileItemNode) => {
    setClipboardFromNode(node, "cut")
  }, [setClipboardFromNode])

  const canPasteInto = useCallback((dstParentId: string | null) => {
    const clipboard = clipboardRef.current
    if (!clipboard.mode || clipboard.nodeIds.length === 0 || !clipboard.sourceProviderId) return false
    if (clipboard.mode === "cut" && clipboard.sourceProviderId !== provider.id) return false
    const target = dstParentId ?? currentFolderId
    if (
      clipboard.mode === "cut" &&
      clipboard.sourceProviderId === provider.id &&
      clipboard.sourceParentId === target
    ) {
      return false
    }
    return true
  }, [currentFolderId, provider.id])

  const pasteInto = useCallback(async (dstParentId: string | null) => {
    const clipboard = clipboardRef.current
    if (!clipboard.mode || clipboard.nodeIds.length === 0 || !clipboard.sourceProviderId) return
    const target = dstParentId ?? currentFolderId
    if (clipboard.sourceProviderId === provider.id) {
      if (clipboard.mode === "cut") {
        if (clipboard.sourceParentId === target) return
        await moveNodes(clipboard.nodeIds, target)
        clearClipboard()
        return
      }
      await copyNodes(clipboard.nodeIds, target)
      return
    }
    if (clipboard.mode === "cut") return
    await transferNodes(clipboard.nodeIds, provider.id, target)
  }, [clearClipboard, copyNodes, currentFolderId, moveNodes, provider.id, transferNodes])

  const handlePasteIntoFolder = useCallback((node: FileItemNode) => {
    if (node.type !== "folder") return
    void pasteInto(node.id)
  }, [pasteInto])

  const canPasteIntoFolderNode = useCallback((node: FileItemNode) => (
    node.type === "folder" && canPasteInto(node.id)
  ), [canPasteInto])

  const handleCopySelection = useCallback(() => {
    const node = selectedNodes[0]
    if (!node) return
    handleCopy(node)
    clearSelection()
  }, [clearSelection, handleCopy, selectedNodes])

  const handleCutSelection = useCallback(() => {
    const node = selectedNodes[0]
    if (!node) return
    handleCut(node)
  }, [handleCut, selectedNodes])

  const handlePasteIntoCurrentFolder = useCallback(() => {
    void pasteInto(currentFolderId)
  }, [currentFolderId, pasteInto])

  const handleDuplicateSelection = useCallback(async () => {
    const node = selectedNodes[0]
    if (!node) return
    await handleDuplicate(node)
  }, [handleDuplicate, selectedNodes])

  const handleDeleteSelection = useCallback(async () => {
    const node = selectedNodes[0]
    if (!node) return
    await handleDelete(node)
  }, [handleDelete, selectedNodes])

  const handleSelectAll = useCallback(() => {
    replaceSelection(listedNodes.map((node) => node.id))
  }, [listedNodes, replaceSelection])

  const handleFilesPicked = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return
      await upload(fileList)
      if (fileInputRef.current) fileInputRef.current.value = ""
    },
    [fileInputRef, upload],
  )

  const uploadFilesToParent = useCallback(
    async (filesInput: FileList | File[], dstParentId: string | null) => {
      await upload(filesInput, dstParentId)
    },
    [upload],
  )

  return {
    handleOpen,
    handleOpenSelection,
    handleOpenSelectionInNewWindow,
    handleOpenInNewWindow,
    handleDelete,
    handleDuplicate,
    handleInfo,
    handleInfoSelection,
    handleDownload,
    handleDownloadSelection,
    startRename,
    handleRenameSelection,
    cancelRename,
    submitRename,
    handleUpload,
    handleNewFolder,
    handleCopy,
    handleCut,
    canPasteInto,
    pasteInto,
    handlePasteIntoFolder,
    canPasteIntoFolderNode,
    handleCopySelection,
    handleCutSelection,
    handlePasteIntoCurrentFolder,
    handleDuplicateSelection,
    handleDeleteSelection,
    handleSelectAll,
    handleFilesPicked,
    uploadFilesToParent,
    deletePending,
    deleteError,
    duplicatePending,
    duplicateError,
    copyPending,
    copyError,
    createFolderPending,
    createFolderError: createFolderError?.message,
    renamePending,
    renameError: renameError?.message,
    uploadPending,
    uploadProgress,
    uploadError,
    moveNodes,
    movePending,
    moveError,
    copyNodes,
    transferNodes,
    moveTransferNodes,
    transferPending,
    transferError,
  }
}
