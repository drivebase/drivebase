import { Suspense, type ReactNode } from "react"
import { cn } from "@drivebase/ui/lib/cn"
import { useWindowStore, type WindowState } from "../stores/window-store"
import { WindowTitlebar } from "./window-titlebar"
import { useWindowResize } from "./use-window-resize"

/** Single window chrome wrapping app content. */
export function WindowFrame({
  win,
  focused,
  children,
}: {
  win: WindowState
  focused: boolean
  children: ReactNode
}) {
  const focus = useWindowStore((s) => s.focus)
  const { onPointerDown: onResizeDown } = useWindowResize(win.id)

  const rect = win.maximized
    ? { left: 0, top: "var(--menubar-h)", width: "100vw", height: "calc(100vh - var(--menubar-h) - var(--dock-h))" }
    : { left: win.x, top: win.y, width: win.w, height: win.h }

  return (
    <div
      role="dialog"
      aria-label={win.title}
      data-window-id={win.id}
      data-focused={focused}
      onPointerDownCapture={() => {
        if (!focused) focus(win.id)
      }}
      className={cn(
        "glass pointer-events-auto absolute flex flex-col overflow-hidden rounded-[var(--window-radius)]",
        focused ? "window-shadow-focus" : "window-shadow",
        win.minimized && "hidden",
        win.opening && "animate-window-open",
        win.closing && "animate-window-close",
      )}
      style={{ ...rect, zIndex: win.z }}
    >
      <WindowTitlebar windowId={win.id} title={win.title} focused={focused || !!win.closing} />
      <div className="relative flex-1 overflow-auto text-[var(--fg)]">
        <Suspense fallback={<div className="p-6 text-sm text-[var(--fg-muted)]">Loading…</div>}>
          {children}
        </Suspense>
      </div>
      {!win.maximized && (
        <button
          type="button"
          aria-label="Resize"
          data-no-drag
          onPointerDown={onResizeDown}
          className="absolute bottom-0 right-0 size-4 cursor-se-resize opacity-0 hover:opacity-100"
        />
      )}
    </div>
  )
}
