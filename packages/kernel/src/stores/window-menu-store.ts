import { create } from "zustand"
import type { AppMenuItem, MenuContribution } from "../registry/app-manifest"

interface WindowMenuStore {
  menusByWindowId: Record<string, MenuContribution[]>
  setMenus: (windowId: string, menus: MenuContribution[]) => void
  clearMenus: (windowId: string) => void
}

export const useWindowMenuStore = create<WindowMenuStore>((set) => ({
  menusByWindowId: {},
  setMenus: (windowId, menus) =>
    set((s) => {
      const current = s.menusByWindowId[windowId]
      if (menusEqual(current, menus)) return s
      return {
        menusByWindowId: {
          ...s.menusByWindowId,
          [windowId]: menus,
        },
      }
    }),
  clearMenus: (windowId) =>
    set((s) => {
      if (!(windowId in s.menusByWindowId)) return s
      const { [windowId]: _removed, ...rest } = s.menusByWindowId
      void _removed
      return { menusByWindowId: rest }
    }),
}))

function menusEqual(a: MenuContribution[] | undefined, b: MenuContribution[]): boolean {
  if (!a) return b.length === 0
  if (a.length !== b.length) return false
  return a.every((menu, index) => {
    const other = b[index]
    if (!other) return false
    return (
      menu.id === other.id &&
      menu.label === other.label &&
      itemsEqual(menu.items, other.items)
    )
  })
}

function itemsEqual(a: AppMenuItem[], b: AppMenuItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => {
    const other = b[index]
    if (!other) return false
    return (
      item.id === other.id &&
      item.label === other.label &&
      item.shortcut === other.shortcut &&
      item.disabled === other.disabled &&
      item.commandId === other.commandId &&
      item.href === other.href &&
      item.separator === other.separator &&
      itemsEqual(item.items ?? [], other.items ?? [])
    )
  })
}
