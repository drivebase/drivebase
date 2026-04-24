import { create } from "zustand"
import { persist, kernelPersist } from "./persist"

interface DesktopShortcutStore {
  knownProviderIds: string[]
  providerShortcutIds: string[]
  syncProviderShortcuts: (providerIds: string[]) => void
  addProviderShortcut: (providerId: string) => void
  removeProviderShortcut: (providerId: string) => void
  hasProviderShortcut: (providerId: string) => boolean
}

export const useDesktopShortcutStore = create<DesktopShortcutStore>()(
  persist(
    (set, get) => ({
      knownProviderIds: [],
      providerShortcutIds: [],
      syncProviderShortcuts: (providerIds) =>
        set((s) => {
          if (providerIds.length === 0) {
            if (s.providerShortcutIds.length === 0 && s.knownProviderIds.length === 0) return s
            return { knownProviderIds: [], providerShortcutIds: [] }
          }

          const allowed = new Set(providerIds)
          const known = s.knownProviderIds.filter((id) => allowed.has(id))
          const retained = s.providerShortcutIds.filter((id) => allowed.has(id))
          const knownSet = new Set(known)
          const discovered = providerIds.filter((id) => !knownSet.has(id))
          const nextKnown = [...known, ...discovered]
          const retainedSet = new Set(retained)
          const nextShortcuts = [
            ...retained,
            ...discovered.filter((id) => !retainedSet.has(id)),
          ]

          if (
            nextKnown.length === s.knownProviderIds.length &&
            nextKnown.every((id, index) => id === s.knownProviderIds[index]) &&
            nextShortcuts.length === s.providerShortcutIds.length &&
            nextShortcuts.every((id, index) => id === s.providerShortcutIds[index])
          ) {
            return s
          }

          return {
            knownProviderIds: nextKnown,
            providerShortcutIds: nextShortcuts,
          }
        }),
      addProviderShortcut: (providerId) =>
        set((s) => {
          const knownProviderIds = s.knownProviderIds.includes(providerId)
            ? s.knownProviderIds
            : [...s.knownProviderIds, providerId]

          if (s.providerShortcutIds.includes(providerId)) {
            if (knownProviderIds === s.knownProviderIds) return s
            return { knownProviderIds }
          }

          return {
            knownProviderIds,
            providerShortcutIds: [...s.providerShortcutIds, providerId],
          }
        }),
      removeProviderShortcut: (providerId) =>
        set((s) => ({
          knownProviderIds: s.knownProviderIds.includes(providerId)
            ? s.knownProviderIds
            : [...s.knownProviderIds, providerId],
          providerShortcutIds: s.providerShortcutIds.filter((id) => id !== providerId),
        })),
      hasProviderShortcut: (providerId) =>
        get().providerShortcutIds.includes(providerId),
    }),
    kernelPersist("desktop-shortcuts"),
  ),
)
