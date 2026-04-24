import { create } from "zustand"
import { persist, kernelPersist } from "./persist"

/**
 * Tiny kernel-side auth state. Session data comes from Better Auth's
 * `useSession()` hook; this store only tracks UX concerns that need to
 * persist across reloads — right now that's the "locked" flag.
 */
interface AuthStore {
  locked: boolean
  lock: () => void
  unlock: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      locked: false,
      lock: () => set({ locked: true }),
      unlock: () => set({ locked: false }),
    }),
    kernelPersist<AuthStore>("auth"),
  ),
)
