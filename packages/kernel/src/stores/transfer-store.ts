import { create } from "zustand"

export interface UploadTransfer {
  id: string
  operationId: string
  fileName: string
  totalBytes: number
  transferredBytes: number
  mode: "proxy" | "direct"
  phase: "transport" | "finalizing"
  createdAt: number
}

interface TransferStore {
  open: boolean
  x: number
  y: number
  uploadTransfers: Record<string, UploadTransfer>
  toggle: () => void
  setOpen: (open: boolean) => void
  setPosition: (x: number, y: number) => void
  startUploadTransfer: (transfer: Omit<UploadTransfer, "createdAt" | "phase" | "transferredBytes">) => void
  updateUploadTransfer: (id: string, transferredBytes: number) => void
  setUploadTransferPhase: (id: string, phase: UploadTransfer["phase"]) => void
  finishUploadTransfer: (id: string) => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  open: false,
  x: -1, // -1 = use default positioning
  y: -1,
  uploadTransfers: {},
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setPosition: (x, y) => set({ x, y }),
  startUploadTransfer: (transfer) =>
    set((s) => ({
      uploadTransfers: {
        ...s.uploadTransfers,
        [transfer.id]: {
          ...transfer,
          createdAt: Date.now(),
          phase: "transport",
          transferredBytes: 0,
        },
      },
    })),
  updateUploadTransfer: (id, transferredBytes) =>
    set((s) => {
      const current = s.uploadTransfers[id]
      if (!current) return s
      return {
        uploadTransfers: {
          ...s.uploadTransfers,
          [id]: {
            ...current,
            transferredBytes: Math.max(
              current.transferredBytes,
              Math.min(transferredBytes, current.totalBytes),
            ),
          },
        },
      }
    }),
  setUploadTransferPhase: (id, phase) =>
    set((s) => {
      const current = s.uploadTransfers[id]
      if (!current) return s
      return {
        uploadTransfers: {
          ...s.uploadTransfers,
          [id]: { ...current, phase },
        },
      }
    }),
  finishUploadTransfer: (id) =>
    set((s) => {
      const next = { ...s.uploadTransfers }
      delete next[id]
      return { uploadTransfers: next }
    }),
}))
