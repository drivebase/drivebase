import { useCallback, useRef, useState } from "react"

/**
 * Multi-select with cmd/ctrl (toggle) + shift (range). Range uses the most
 * recent click as the anchor. Backed by a Set keyed by node id so callers
 * can `selection.has(id)` without sweeping an array.
 *
 * The anchor is a ref (not state) so it survives re-renders without driving
 * extra paints when the user is just clicking around.
 */
export function useFileSelection() {
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const anchor = useRef<string | null>(null)

  const clear = useCallback(() => {
    setSelection(new Set())
    anchor.current = null
  }, [])

  const handleItemClick = useCallback(
    (
      id: string,
      orderedIds: string[],
      event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
    ) => {
      setSelection((prev) => {
        const next = new Set(prev)
        if (event.metaKey || event.ctrlKey) {
          if (next.has(id)) next.delete(id)
          else next.add(id)
          anchor.current = id
          return next
        }
        if (event.shiftKey && anchor.current && orderedIds.length > 0) {
          const a = orderedIds.indexOf(anchor.current)
          const b = orderedIds.indexOf(id)
          if (a === -1 || b === -1) {
            next.clear()
            next.add(id)
            anchor.current = id
            return next
          }
          const [lo, hi] = a < b ? [a, b] : [b, a]
          next.clear()
          for (let i = lo; i <= hi; i++) {
            const nid = orderedIds[i]
            if (nid) next.add(nid)
          }
          return next
        }
        next.clear()
        next.add(id)
        anchor.current = id
        return next
      })
    },
    [],
  )

  const replaceSelection = useCallback((ids: string[], nextAnchor?: string | null) => {
    setSelection(new Set(ids))
    anchor.current = nextAnchor ?? ids[0] ?? null
  }, [])

  return { selection, clear, handleItemClick, replaceSelection } as const
}
