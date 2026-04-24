import { useBootStore } from "../stores/boot-store"

/**
 * Thin top-of-screen progress bar. Shown only during pre-ready boot phases
 * (splash / restoring). Indeterminate when progress < 0, otherwise fills by
 * `progress` (0..1).
 */
export function LoadingBar() {
  const phase = useBootStore((s) => s.phase)
  const progress = useBootStore((s) => s.progress)
  if (phase === "ready" || phase === "auth" || phase === "locked") return null
  if (progress >= 1) return null
  const indeterminate = progress < 0
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[3000] h-[2px] overflow-hidden">
      <div
        className="h-full bg-[var(--accent)]"
        style={
          indeterminate
            ? { width: "30%", animation: "kernel-loading-slide 1.4s ease-in-out infinite" }
            : { width: `${Math.min(100, progress * 100)}%`, transition: "width 200ms ease" }
        }
      />
      <style>{`@keyframes kernel-loading-slide {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }`}</style>
    </div>
  )
}
