import { useMemo } from "react"
import { cn } from "@drivebase/ui/lib/cn"
import { Icon } from "@drivebase/ui/primitives/icon"
import { TransfersAppIcon } from "@drivebase/ui/components/app-icons"
import { useAppRegistryStore } from "../stores/app-registry-store"
import { useWindowStore } from "../stores/window-store"
import { useLayoutStore } from "../stores/layout-store"
import { useTransferStore } from "../stores/transfer-store"
import { useBus } from "../bus/context"
import type { AppManifest } from "../registry/app-manifest"

/** Bottom dock. Launches / focuses / minimizes apps. */
export function Dock() {
  const apps = useAppRegistryStore((s) => s.apps)
  const order = useAppRegistryStore((s) => s.order)
  const dockOrder = useLayoutStore((s) => s.dockOrder)
  const windows = useWindowStore((s) => s.windows)
  const bus = useBus()
  const toggleTransfers = useTransferStore((s) => s.toggle)
  const transfersOpen = useTransferStore((s) => s.open)

  const items = useMemo(() => {
    const ids = dockOrder.length ? dockOrder : order
    return ids.map((id) => apps[id]).filter(Boolean) as AppManifest[]
  }, [apps, order, dockOrder])

  const onClick = (app: AppManifest) => {
    const existing = Object.values(windows)
      .filter((w) => w.appId === app.id && !w.closing)
      .sort((a, b) => b.z - a.z)[0]
    if (!existing) {
      bus.emit("app.launch", { appId: app.id })
      return
    }
    useWindowStore.getState().focus(existing.id)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[1200] flex justify-center">
      <div className="bg-black/10 backdrop-blur-md window-shadow pointer-events-auto flex h-[var(--dock-h)] items-center gap-4 rounded-2xl border border-[var(--border)] px-3 pb-2 pt-2">
        {items.map((app) => {
          const open = Object.values(windows).some((w) => w.appId === app.id && !w.minimized)
          return (
            <button
              key={app.id}
              type="button"
              aria-label={app.name}
              onClick={() => onClick(app)}
              className={cn(
                "group relative flex size-12 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--fg)]",
              )}
            >
              <Icon spec={app.icon} className="size-12" />
              <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-md bg-[var(--fg)] px-2 py-1 text-[11px] text-[var(--bg)] opacity-0 transition-opacity group-hover:opacity-100">
                {app.name}
              </span>
              {open && (
                <span className="absolute -bottom-1.5 size-1 rounded-full bg-[var(--fg)]" />
              )}
            </button>
          )
        })}

        {/* Separator */}
        {items.length > 0 && (
          <div className="mx-0.5 h-8 w-px self-center bg-[var(--border)]" />
        )}

        {/* Transfers toggle */}
        <button
          type="button"
          aria-label="Transfers"
          onClick={toggleTransfers}
          className={cn(
            "group relative flex size-12 items-center justify-center rounded-xl text-[var(--fg)]",
            transfersOpen
              ? "bg-[var(--accent-soft)] text-[var(--accent-soft-fg)]"
              : "bg-[var(--bg-subtle)]",
          )}
        >
          <TransfersAppIcon className="size-12 object-contain" />
          <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-md bg-[var(--fg)] px-2 py-1 text-[11px] text-[var(--bg)] opacity-0 transition-opacity group-hover:opacity-100">
            Transfers
          </span>
          {transfersOpen && (
            <span className="absolute -bottom-1.5 size-1 rounded-full bg-[var(--accent)]" />
          )}
        </button>
      </div>
    </div>
  )
}
