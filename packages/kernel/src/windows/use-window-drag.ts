import { useCallback, useRef } from "react"
import { useWindowStore } from "../stores/window-store"

/**
 * Returns a `pointerdown` handler for dragging a window by its titlebar.
 * Moves the DOM node via transform during drag and commits the final
 * position to the store on release, so dragging doesn't rerender window
 * contents every frame.
 */
export function useWindowDrag(windowId: string) {
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)
  const frameRef = useRef<HTMLElement | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest("[data-no-drag]")) return
      const frame = e.currentTarget.closest("[data-window-id]") as HTMLElement | null
      if (!frame) return

      const state = useWindowStore.getState()
      const win = state.windows[windowId]
      if (!win) return
      state.focus(windowId)
      if (win.maximized) return
      frameRef.current = frame

      const startPointerX = e.clientX
      const startPointerY = e.clientY
      const startX = win.x
      const startY = win.y
      let dragStarted = false

      const onMove = (ev: PointerEvent) => {
        pendingRef.current = {
          x: Math.max(0, startX + (ev.clientX - startPointerX)),
          y: Math.max(0, startY + (ev.clientY - startPointerY)),
        }
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            const next = pendingRef.current
            const el = frameRef.current
            if (next && el) {
              dragStarted = true
              el.style.willChange = "transform"
              el.style.transform = `translate3d(${next.x - startX}px, ${next.y - startY}px, 0)`
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
          const el = frameRef.current
          if (el) {
            el.style.transform = ""
            el.style.willChange = ""
          }
          useWindowStore.getState().move(windowId, pendingRef.current)
          pendingRef.current = null
        }
        if (!dragStarted && frameRef.current) {
          frameRef.current.style.transform = ""
          frameRef.current.style.willChange = ""
        }
        frameRef.current = null
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
