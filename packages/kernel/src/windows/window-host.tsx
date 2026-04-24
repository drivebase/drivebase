import { createElement, useCallback, useEffect } from "react"
import { useWindowStore } from "../stores/window-store"
import { useAppRegistryStore } from "../stores/app-registry-store"
import { WindowFrame } from "./window-frame"
import type { AppProps, AppManifest } from "../registry/app-manifest"

function WindowInstance({
  windowId,
  manifest,
  setPayload,
}: {
  windowId: string
  manifest: AppManifest
  setPayload: (id: string, payload: unknown) => void
}) {
  const win = useWindowStore((s) => s.windows[windowId] ?? null)
  const focused = useWindowStore((s) => s.focusedId === windowId)
  const clearOpening = useWindowStore((s) => s.clearOpening)
  const remove = useWindowStore((s) => s.remove)

  useEffect(() => {
    if (!win) return
    if (!win.opening) return
    const t = setTimeout(() => clearOpening(win.id), 260)
    return () => clearTimeout(t)
  }, [win, clearOpening])

  useEffect(() => {
    if (!win) return
    if (!win.closing) return
    const t = setTimeout(() => remove(win.id), 200)
    return () => clearTimeout(t)
  }, [win, remove])

  if (!win) return null

  const setWinPayload = useCallback(
    (payload: unknown) => setPayload(win.id, payload),
    [win.id, setPayload],
  )

  const props: AppProps = {
    windowId: win.id,
    payload: win.payload,
    setPayload: setWinPayload,
  }

  return (
    <WindowFrame win={win} focused={focused}>
      {createElement(manifest.component as React.ComponentType<AppProps>, props)}
    </WindowFrame>
  )
}

/**
 * Renders all open windows in z-order. Mounted once inside <Shell>.
 * Each window pulls its component from the app registry by appId.
 */
export function WindowHost() {
  const order = useWindowStore((s) => s.order)
  const setPayload = useWindowStore((s) => s.setPayload)
  const apps = useAppRegistryStore((s) => s.apps)

  return (
    <div className="pointer-events-none absolute inset-0 z-[1000]">
      {order.map((id) => {
        const win = useWindowStore.getState().windows[id]
        if (!win) return null
        const manifest = apps[win.appId]
        if (!manifest) return null
        return (
          <WindowInstance
            key={id}
            windowId={id}
            manifest={manifest}
            setPayload={setPayload}
          />
        )
      })}
    </div>
  )
}
