export function FilesWindowOverlay({ mode }: { mode: "move" | "copy" }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[var(--window-radius)] border-2 border-[var(--accent)] bg-[var(--accent)]/10">
      <div className="flex flex-col items-center gap-0.5 rounded-[var(--radius-md)] bg-[var(--bg)] px-3 py-1.5 shadow">
        <span className="text-xs font-medium text-[var(--accent)]">Drop here</span>
        <span className="text-[10px] text-[var(--fg-muted)]">
          {mode === "move" ? "Hold Alt to copy" : "Release Alt to move"}
        </span>
      </div>
    </div>
  )
}
