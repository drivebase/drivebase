import { create } from "zustand"

export type FilesClipboardMode = "copy" | "cut"

export interface FilesClipboardState {
  mode: FilesClipboardMode | null
  nodeIds: string[]
  sourceProviderId: string | null
  sourceParentId: string | null
  setClipboard: (input: {
    mode: FilesClipboardMode
    nodeIds: string[]
    sourceProviderId: string
    sourceParentId: string | null
  }) => void
  clearClipboard: () => void
}

export const useFilesClipboardStore = create<FilesClipboardState>((set) => ({
  mode: null,
  nodeIds: [],
  sourceProviderId: null,
  sourceParentId: null,
  setClipboard: ({ mode, nodeIds, sourceProviderId, sourceParentId }) =>
    set({
      mode,
      nodeIds,
      sourceProviderId,
      sourceParentId,
    }),
  clearClipboard: () =>
    set({
      mode: null,
      nodeIds: [],
      sourceProviderId: null,
      sourceParentId: null,
    }),
}))
