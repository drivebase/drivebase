import { create } from "zustand"

export type BootPhase = "splash" | "auth" | "restoring" | "ready" | "locked"

interface BootStore {
  phase: BootPhase
  progress: number // 0..1, indeterminate if < 0
  setPhase: (phase: BootPhase) => void
  setProgress: (n: number) => void
}

export const useBootStore = create<BootStore>((set) => ({
  phase: "splash",
  progress: -1,
  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
}))
