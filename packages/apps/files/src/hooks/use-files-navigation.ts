import { useCallback, useState } from "react"

export interface BreadcrumbCrumb {
  /** Server node id of the folder. `null` = provider root. */
  id: string | null
  name: string
}

/**
 * Navigation stack for a single Files window. The first crumb is the
 * provider root (name = provider label). Pushing descends; clicking a crumb
 * truncates the stack.
 *
 * We keep only ids+names (not full Node objects) so navigation state is
 * cheap to persist later when window restore is added.
 */
export function useFilesNavigation(rootName: string, initialStack?: BreadcrumbCrumb[]) {
  const [stack, setStack] = useState<BreadcrumbCrumb[]>(
    initialStack && initialStack.length > 0
      ? initialStack
      : [{ id: null, name: rootName }],
  )

  const current = stack[stack.length - 1] ?? { id: null, name: rootName }

  const push = useCallback((crumb: BreadcrumbCrumb) => {
    setStack((s) => [...s, crumb])
  }, [])

  const jumpTo = useCallback((index: number) => {
    setStack((s) => (index >= 0 && index < s.length ? s.slice(0, index + 1) : s))
  }, [])

  const resetRoot = useCallback((name: string) => {
    setStack([{ id: null, name }])
  }, [])

  return { stack, current, push, jumpTo, resetRoot } as const
}
