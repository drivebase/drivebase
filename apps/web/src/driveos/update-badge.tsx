import { useAppUpdate } from "@drivebase/data"

export function UpdateBadge() {
  const { isUpdateAvailable, latestVersion } = useAppUpdate()

  if (!isUpdateAvailable) return null

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-medium text-white">
      <span className="size-1.5 rounded-full bg-white/70" />
      {latestVersion} available
    </span>
  )
}
