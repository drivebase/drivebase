import { create } from "zustand"
import { persist, kernelPersist } from "./persist"

export type WallpaperVariant = "topo" | "linen" | "gradient" | "solid"

interface LayoutStore {
  wallpaper: WallpaperVariant
  dockOrder: string[] // appIds in user-chosen order; empty → registration order
  restoreOnReload: boolean
  setWallpaper: (w: WallpaperVariant) => void
  setDockOrder: (ids: string[]) => void
  setRestoreOnReload: (v: boolean) => void
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      wallpaper: "topo",
      dockOrder: [],
      restoreOnReload: true,
      setWallpaper: (wallpaper) => set({ wallpaper }),
      setDockOrder: (dockOrder) => set({ dockOrder }),
      setRestoreOnReload: (restoreOnReload) => set({ restoreOnReload }),
    }),
    kernelPersist<LayoutStore>("layout"),
  ),
)
