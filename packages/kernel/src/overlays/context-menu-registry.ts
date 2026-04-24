import type { ReactNode } from "react"

/**
 * Zones where apps can contribute context-menu items. Adding a zone means
 * pointing a `<ContextMenuZone>` at it and letting apps register factories
 * via `registerContextMenu`.
 */
export type ContextMenuZoneId =
  | "files.item"
  | "files.background"
  | "desktop.background"
  | "desktop.shortcut"
  | "dock.item"
  | "window.titlebar"

export interface ContextMenuItem {
  id: string
  label: string
  /** Leading glyph — typically a small lucide icon. */
  icon?: ReactNode
  /** Decorative hint like "⌘⌫" shown right-aligned. Purely informational. */
  shortcut?: string
  disabled?: boolean
  /** Render in the danger tone. Used for delete / cancel-op kinds of actions. */
  destructive?: boolean
  onSelect: () => void | Promise<void>
}

export interface ContextMenuSeparator {
  id: string
  separator: true
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

export type ContextMenuFactory<Payload> = (
  payload: Payload,
) => ContextMenuEntry[]

/**
 * Multiple apps can contribute to the same zone; we iterate in registration
 * order and concatenate their results. `registerContextMenu` returns a
 * deregister function so HMR boundaries and unmounting apps clean up.
 *
 * The Set per zone keeps registration O(1) and guarantees no duplicate
 * factories for the same module.
 */
const registrations = new Map<ContextMenuZoneId, Set<ContextMenuFactory<unknown>>>()

export function registerContextMenu<Payload = unknown>(
  zone: ContextMenuZoneId,
  factory: ContextMenuFactory<Payload>,
): () => void {
  let set = registrations.get(zone)
  if (!set) {
    set = new Set()
    registrations.set(zone, set)
  }
  const entry = factory as ContextMenuFactory<unknown>
  set.add(entry)
  return () => {
    set?.delete(entry)
  }
}

export function getContextMenuEntries<Payload>(
  zone: ContextMenuZoneId,
  payload: Payload,
): ContextMenuEntry[] {
  const set = registrations.get(zone)
  if (!set || set.size === 0) return []
  const out: ContextMenuEntry[] = []
  for (const factory of set) {
    const entries = (factory as ContextMenuFactory<Payload>)(payload)
    for (const e of entries) out.push(e)
  }
  return out
}

export function isContextMenuSeparator(
  entry: ContextMenuEntry,
): entry is ContextMenuSeparator {
  return (entry as ContextMenuSeparator).separator === true
}
