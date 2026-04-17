import { useEffect } from "react";
import { eventBus } from "@/lib/event-bus";
import type { EventMap } from "@/lib/event-bus";

export function useEvent<K extends keyof EventMap>(
  event: K,
  handler: (payload: EventMap[K]) => void,
): void {
  useEffect(() => {
    return eventBus.on(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
