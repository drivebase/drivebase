import type { ComponentType, LazyExoticComponent } from "react"
import type { IconSpec as UIIconSpec } from "@drivebase/ui/primitives/icon"

export type IconSpec = UIIconSpec

export interface AppProps {
  windowId: string
  payload?: unknown
  setPayload?: (payload: unknown) => void
}

export interface AppMenuItem {
  id: string
  label?: string
  shortcut?: string
  disabled?: boolean
  commandId?: string
  onSelect?: () => void
  href?: string
  items?: AppMenuItem[]
  separator?: boolean
}

export interface MenuContribution {
  id: string
  label: string
  items: AppMenuItem[]
}

export interface CommandContribution {
  id: string
  title: string
  keywords?: string[]
  shortcut?: string
  run: () => void | Promise<void>
}

export interface DesktopShortcutSpec {
  id: string
  label: string
  icon?: IconSpec
  payload?: unknown
}

export interface AppManifest {
  id: string
  name: string
  icon: IconSpec
  version: string
  singleton?: boolean
  defaultWindowSize: { w: number; h: number }
  minWindowSize?: { w: number; h: number }
  component: LazyExoticComponent<ComponentType<AppProps>> | ComponentType<AppProps>
  menuContributions?: MenuContribution[]
  commands?: CommandContribution[]
  shortcuts?: DesktopShortcutSpec[]
  onLaunch?: (payload?: unknown) => void | Promise<void>
  persistKey?: string
}
