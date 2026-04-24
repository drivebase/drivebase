import { useCallback, useRef } from "react"

/**
 * Generic rAF-based drag for floating panels. Returns a `onPointerDown`
 * handler to attach to the drag handle. Calls `onMove(x, y)` during drag
 * and `onCommit(x, y)` on release.
 */
export function usePanelDrag(onCommit: (x: number, y: number) => void) {
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, currentX: number, currentY: number) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return
      const startPointerX = e.clientX
      const startPointerY = e.clientY

      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        pendingRef.current = {
          x: Math.max(0, currentX + (ev.clientX - startPointerX)),
          y: Math.max(0, currentY + (ev.clientY - startPointerY)),
        }
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            if (pendingRef.current) {
              onCommit(pendingRef.current.x, pendingRef.current.y)
            }
          })
        }
      }

      document.body.style.cursor = "grabbing"

      const onUp = () => {
        document.body.style.cursor = ""
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        if (pendingRef.current) {
          onCommit(pendingRef.current.x, pendingRef.current.y)
          pendingRef.current = null
        }
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [onCommit],
  )

  return { onPointerDown }
}
