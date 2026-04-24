import { create } from "zustand"
import type { AppManifest } from "../registry/app-manifest"

interface AppRegistryStore {
  apps: Record<string, AppManifest>
  order: string[]
  register: (manifest: AppManifest) => void
  unregister: (appId: string) => void
  get: (appId: string) => AppManifest | undefined
}

export const useAppRegistryStore = create<AppRegistryStore>((set, get) => ({
  apps: {},
  order: [],
  register: (manifest) =>
    set((s) => {
      if (s.apps[manifest.id]) return s
      return {
        apps: { ...s.apps, [manifest.id]: manifest },
        order: [...s.order, manifest.id],
      }
    }),
  unregister: (appId) =>
    set((s) => {
      const { [appId]: _removed, ...rest } = s.apps
      void _removed
      return {
        apps: rest,
        order: s.order.filter((id) => id !== appId),
      }
    }),
  get: (appId) => get().apps[appId],
}))
