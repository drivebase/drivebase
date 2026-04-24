import { useWindowStore } from "../stores/window-store"

/**
 * Prototype-style titlebar controls: 14×14 squared buttons with a faint white
 * border, dark-bar background, icons hidden until the group is hovered.
 * Close hover turns red. Sits on the left of the titlebar.
 */
export function WindowControls({ windowId }: { windowId: string }) {
  const close = useWindowStore((s) => s.close)
  const minimize = useWindowStore((s) => s.minimize)
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize)

  return (
    <div className="group/controls flex items-center gap-1" data-no-drag>
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onClick={(e) => {
          e.stopPropagation()
          close(windowId)
        }}
        className="flex size-[14px] items-center justify-center border border-white/20 bg-white/10 text-white/90 transition-colors hover:border-transparent hover:bg-[var(--danger)]"
      >
        <CloseIcon />
      </button>
      <button
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onClick={(e) => {
          e.stopPropagation()
          minimize(windowId)
        }}
        className="flex size-[14px] items-center justify-center border border-white/20 bg-white/10 text-white/90 transition-colors hover:bg-white/30"
      >
        <MinimizeIcon />
      </button>
      <button
        type="button"
        aria-label="Maximize"
        title="Maximize"
        onClick={(e) => {
          e.stopPropagation()
          toggleMaximize(windowId)
        }}
        className="flex size-[14px] items-center justify-center border border-white/20 bg-white/10 text-white/90 transition-colors hover:bg-white/30"
      >
        <MaximizeIcon />
      </button>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      className="opacity-0 transition-opacity duration-100 group-hover/controls:opacity-100"
    >
      <path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      className="opacity-0 transition-opacity duration-100 group-hover/controls:opacity-100"
    >
      <path d="M1.5 4 L6.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function MaximizeIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      className="opacity-0 transition-opacity duration-100 group-hover/controls:opacity-100"
    >
      <rect x="1.5" y="1.5" width="5" height="5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}
