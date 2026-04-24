import { cn } from "@drivebase/ui/lib/cn"
import { useWindowDrag } from "./use-window-drag"
import { useWindowStore } from "../stores/window-store"
import { WindowControls } from "./window-controls"

/**
 * Prototype-style dark titlebar. 28px tall, centered uppercase title,
 * controls pinned left, optional slot on the right (kept as a fixed width
 * placeholder so the centered title stays visually balanced).
 */
export function WindowTitlebar({
  windowId,
  title,
  focused,
}: {
  windowId: string
  title: string
  focused: boolean
}) {
  const { onPointerDown } = useWindowDrag(windowId)
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize)
  return (
    <div
      className={cn(
        "drag-region relative flex h-[var(--window-titlebar-h)] flex-shrink-0 cursor-default select-none items-center gap-2 px-2.5",
        "text-[var(--titlebar-ink)]",
      )}
      style={{
        background: focused ? "var(--titlebar)" : "var(--titlebar-inactive)",
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={() => toggleMaximize(windowId)}
    >
      <WindowControls windowId={windowId} />
      <div className="pointer-events-none flex-1 truncate text-center text-[11.5px] font-medium uppercase tracking-[0.01em]">
        {title}
      </div>
      <div className="w-[54px]" />
    </div>
  )
}
