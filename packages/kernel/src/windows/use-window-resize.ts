import { useCallback, useRef } from "react"
import { useWindowStore } from "../stores/window-store"

const MIN_W = 320
const MIN_H = 220

/**
 * Resize handle at bottom-right corner. Same rAF pattern as drag.
 */
export function useWindowResize(windowId: string) {
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<{ w: number; h: number } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      e.stopPropagation()
      const win = useWindowStore.getState().windows[windowId]
      if (!win || win.maximized) return
      const startX = e.clientX
      const startY = e.clientY
      const startW = win.w
      const startH = win.h

      const onMove = (ev: PointerEvent) => {
        pendingRef.current = {
          w: Math.max(MIN_W, startW + (ev.clientX - startX)),
          h: Math.max(MIN_H, startH + (ev.clientY - startY)),
        }
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            if (pendingRef.current) {
              useWindowStore.getState().resize(windowId, pendingRef.current)
            }
          })
        }
      }
      const onUp = () => {
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        if (pendingRef.current) {
          useWindowStore.getState().resize(windowId, pendingRef.current)
          pendingRef.current = null
        }
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [windowId],
  )

  return { onPointerDown }
}
