import { createContext, useContext, useMemo, type ReactNode, type ComponentType } from "react"

export interface MenuItem {
  id: string
  label?: string
  shortcut?: string
  disabled?: boolean
  commandId?: string
  onSelect?: () => void
  /** Open an external URL in a new tab. */
  href?: string
  items?: MenuItem[]
  separator?: boolean
}

export interface DesktopMenu {
  id: string
  label: string
  items?: MenuItem[]
  /** Shortcut form for single-click links (e.g. GitHub). When present the
   *  menubar renders a plain clickable label instead of a dropdown. */
  href?: string
}

export interface KernelConfig {
  /** Brand name shown as the first bold item in the menubar. */
  brandName: string
  /** Items rendered inside the brand icon menubar menu. */
  systemMenuItems: MenuItem[]
  /**
   * Menus shown in the menubar when no window is focused (desktop state).
   * Apps still contribute their own menus when focused.
   */
  desktopMenus: DesktopMenu[]
  /** Optional component rendered in the menubar right section, before the theme toggle. */
  MenuBarExtra?: ComponentType
}

const DEFAULT_CONFIG: KernelConfig = {
  brandName: "Drivebase",
  systemMenuItems: [],
  desktopMenus: [],
}

const ConfigContext = createContext<KernelConfig>(DEFAULT_CONFIG)

export function KernelConfigProvider({
  config,
  children,
}: {
  config?: Partial<KernelConfig>
  children: ReactNode
}) {
  const value = useMemo<KernelConfig>(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useKernelConfig(): KernelConfig {
  return useContext(ConfigContext)
}
