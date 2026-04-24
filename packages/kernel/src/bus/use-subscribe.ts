import { useEffect } from "react"
import { useBus } from "./context"
import type { KernelEventMap, KernelEventName } from "./types"

/**
 * Subscribe to a kernel event for the lifetime of the calling component.
 * Handler identity is captured by ref so callers don't need to memoize.
 */
export function useSubscribe<E extends KernelEventName>(
  event: E,
  handler: (payload: KernelEventMap[E]) => void,
): void {
  const bus = useBus()
  useEffect(() => {
    bus.on(event, handler)
    return () => {
      bus.off(event, handler)
    }
  }, [bus, event, handler])
}
