import { create } from "zustand"
import { persist, kernelPersist } from "./persist"

export type Theme = "light" | "dark"

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: () => {
        applyThemeToDocument("dark")
        set({ theme: "dark" })
      },
      toggle: () => {
        get().setTheme("dark")
      },
    }),
    kernelPersist<ThemeStore>("theme", {
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setTheme("dark")
          return
        }
        applyThemeToDocument("dark")
      },
    }),
  ),
)
