import { useEffect } from "react"
import { Wallpaper } from "@drivebase/ui/primitives/wallpaper"
import { useLayoutStore } from "../stores/layout-store"
import { MenuBar } from "./menubar"
import { Dock } from "./dock"
import { Desktop } from "./desktop"
import { WindowHost } from "../windows/window-host"
import { useBus } from "../bus/context"
import { useWindowStore } from "../stores/window-store"
import { useAppRegistryStore } from "../stores/app-registry-store"
import { TransferPanel } from "../overlays/transfer-panel"
import { useAuthStore } from "../stores/auth-store"
import { LockScreen } from "../auth/lock-screen"

/**
 * The DriveOS shell. Owns wallpaper, menubar, dock, window host and boot gating.
 * Expects <KernelProvider> above it.
 */
export function Shell() {
  const wallpaper = useLayoutStore((s) => s.wallpaper)
  const bus = useBus()
  const locked = useAuthStore((s) => s.locked)

  // Wire `app.launch` → window-store. Kernel-level default behavior.
  useEffect(() => {
    const onLaunch = ({ appId, payload }: { appId: string; payload?: unknown }) => {
      const manifest = useAppRegistryStore.getState().get(appId)
      if (!manifest) return
      const state = useWindowStore.getState()
      if (manifest.singleton) {
        const existing = Object.values(state.windows).find((w) => w.appId === appId)
        if (existing) {
          state.focus(existing.id)
          return
        }
      }
      state.open({
        appId,
        title: manifest.name,
        w: manifest.defaultWindowSize.w,
        h: manifest.defaultWindowSize.h,
        payload,
      })
      manifest.onLaunch?.(payload)
    }
    bus.on("app.launch", onLaunch)
    return () => bus.off("app.launch", onLaunch)
  }, [bus])

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Wallpaper variant={wallpaper} />
      <MenuBar />
      <Desktop />
      <WindowHost />
      <Dock />
      <TransferPanel />
      {locked ? <LockScreen /> : null}
    </div>
  )
}
