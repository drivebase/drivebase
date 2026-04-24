import { create } from "zustand"
import { persist, kernelPersist } from "./persist"

export type Theme = "light" | "dark"

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

/**
 * Attach/detach `.dark` on the document root in response to the theme store.
 * Called synchronously from setters and on persist rehydrate so the class
 * stays in sync with the store after boot. The no-flash boot paint is owned
 * by the inline script in `apps/web/src/routes/__root.tsx`.
 */
export function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        applyThemeToDocument(theme)
        set({ theme })
      },
      toggle: () => {
        const next = get().theme === "light" ? "dark" : "light"
        applyThemeToDocument(next)
        set({ theme: next })
      },
    }),
    kernelPersist<ThemeStore>("theme", {
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDocument(state.theme)
      },
    }),
  ),
)
