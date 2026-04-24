import { useEffect, useMemo } from "react"
import { useMyProviders } from "@drivebase/data"
import { Icon } from "@drivebase/ui/primitives/icon"
import { ContextMenuZone } from "../overlays/context-menu-zone"
import { registerContextMenu, type ContextMenuEntry } from "../overlays/context-menu-registry"
import { useAppRegistryStore } from "../stores/app-registry-store"
import { useDesktopShortcutStore } from "../stores/desktop-shortcut-store"
import { useLayoutStore } from "../stores/layout-store"
import { useBus } from "../bus/context"
import type { IconSpec } from "../registry/app-manifest"

interface DesktopBackgroundMenuPayload {
  onChangeBackground: () => void
}

interface DesktopShortcutMenuPayload {
  removable: boolean
  onOpen: () => void
  onRemove?: () => void
}

interface DesktopShortcut {
  id: string
  appId: string
  label: string
  payload?: unknown
  icon: IconSpec
  removable: boolean
}

const desktopMenuRegistry = globalThis as typeof globalThis & {
  __drivebaseDesktopMenusCleanup__?: () => void
}

let desktopMenusRegistered = false

function registerDesktopContextMenus(): void {
  if (desktopMenusRegistered) return
  desktopMenuRegistry.__drivebaseDesktopMenusCleanup__?.()
  desktopMenusRegistered = true

  const unregisterBackground = registerContextMenu<DesktopBackgroundMenuPayload>(
    "desktop.background",
    (payload) => {
      const entries: ContextMenuEntry[] = [
        {
          id: "change-background",
          label: "Change Wallpaper",
          onSelect: payload.onChangeBackground,
        },
        { id: "sep-1", separator: true },
        {
          id: "edit-widgets",
          label: "Edit Widgets",
          disabled: true,
          onSelect: () => undefined,
        },
        {
          id: "desktop-settings",
          label: "Desktop Settings…",
          disabled: true,
          onSelect: () => undefined,
        },
      ]

      return entries
    },
  )

  const unregisterShortcut = registerContextMenu<DesktopShortcutMenuPayload>(
    "desktop.shortcut",
    (payload) => {
      const entries: ContextMenuEntry[] = [
        {
          id: "open",
          label: "Open",
          onSelect: payload.onOpen,
        },
      ]

      if (payload.removable && payload.onRemove) {
        entries.push({ id: "sep-1", separator: true })
        entries.push({
          id: "remove",
          label: "Remove from Desktop",
          onSelect: payload.onRemove,
        })
      }

      return entries
    },
  )

  const cleanup = () => {
    unregisterBackground()
    unregisterShortcut()
    if (desktopMenuRegistry.__drivebaseDesktopMenusCleanup__ === cleanup) {
      desktopMenuRegistry.__drivebaseDesktopMenusCleanup__ = undefined
    }
    desktopMenusRegistered = false
  }

  desktopMenuRegistry.__drivebaseDesktopMenusCleanup__ = cleanup

  ;(
    import.meta as ImportMeta & {
      hot?: {
        dispose(cb: () => void): void
      }
    }
  ).hot?.dispose(cleanup)
}

/** Wallpaper layer where desktop shortcuts live. Apps contribute shortcuts via manifest. */
export function Desktop() {
  registerDesktopContextMenus()

  const apps = useAppRegistryStore((s) => s.apps)
  const providerShortcutIds = useDesktopShortcutStore((s) => s.providerShortcutIds)
  const syncProviderShortcuts = useDesktopShortcutStore((s) => s.syncProviderShortcuts)
  const removeProviderShortcut = useDesktopShortcutStore((s) => s.removeProviderShortcut)
  const wallpaper = useLayoutStore((s) => s.wallpaper)
  const setWallpaper = useLayoutStore((s) => s.setWallpaper)
  const { providers, fetching: providersFetching } = useMyProviders()
  const bus = useBus()

  useEffect(() => {
    if (providersFetching) return
    syncProviderShortcuts(providers.map((provider) => provider.id))
  }, [providers, providersFetching, syncProviderShortcuts])

  useEffect(() => {
    if (wallpaper !== "gradient") return
    setWallpaper("topo")
  }, [setWallpaper, wallpaper])

  const shortcuts = useMemo<DesktopShortcut[]>(() => {
    const providerShortcuts = providers
      .filter((provider) => providerShortcutIds.includes(provider.id))
      .map((provider) => ({
        id: `files:provider:${provider.id}`,
        appId: "files",
        label: provider.label,
        payload: {
          providerId: provider.id,
          path: [{ id: null, name: provider.label }],
        },
        icon: providerIcon(provider.type),
        removable: true,
      }))

    const appShortcuts = Object.values(apps).flatMap((a) =>
      (a.shortcuts ?? []).map((spec) => ({
        id: `${a.id}:${spec.id}`,
        appId: a.id,
        label: spec.label,
        payload: spec.payload,
        icon: spec.icon ?? a.icon,
        removable: false,
      })),
    )

    return [...providerShortcuts, ...appShortcuts]
  }, [apps, providerShortcutIds, providers])

  return (
    <ContextMenuZone
      zone="desktop.background"
      payload={{
        onChangeBackground: () => undefined,
      }}
      asChild={false}
      className="fixed inset-0 z-0"
    >
      <div
        style={{
          paddingTop: "var(--menubar-h)",
          paddingBottom: "var(--dock-h)",
        }}
      >
        <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,88px)] gap-4 p-4">
          {shortcuts.map(({ id, appId, label, payload, icon, removable }) => (
            <ContextMenuZone
              key={id}
              zone="desktop.shortcut"
              payload={{
                removable,
                onOpen: () => bus.emit("app.launch", { appId, payload }),
                onRemove: removable
                  ? () => {
                      const providerId = id.startsWith("files:provider:")
                        ? id.slice("files:provider:".length)
                        : null
                      if (!providerId) return
                      removeProviderShortcut(providerId)
                    }
                  : undefined,
              }}
            >
              <button
                type="button"
                onDoubleClick={() => bus.emit("app.launch", { appId, payload })}
                className="flex flex-col items-center gap-1 rounded-lg p-2 text-[11.5px] text-[var(--fg)] hover:bg-[var(--glass-bg)]"
              >
                <span className="flex size-14 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--fg)]">
                  <Icon spec={icon} size={28} />
                </span>
                <span className="max-w-[80px] truncate">{label}</span>
              </button>
            </ContextMenuZone>
          ))}
        </div>
      </div>
    </ContextMenuZone>
  )
}

function providerIcon(type: string): IconSpec {
  switch (type) {
    case "google_drive":
      return { kind: "iconify", name: "logos--google-drive" }
    case "dropbox":
      return { kind: "iconify", name: "logos--dropbox" }
    case "onedrive":
      return { kind: "iconify", name: "logos--microsoft-onedrive" }
    case "s3":
      return { kind: "iconify", name: "logos--aws-s3" }
    case "r2":
      return { kind: "iconify", name: "logos--cloudflare" }
    case "local":
      return { kind: "iconify", name: "lucide--hard-drive" }
    default:
      return { kind: "iconify", name: "lucide--cloud" }
  }
}
