import { SettingsGroup } from "../components/settings-group"
import { useAppUpdate } from "@drivebase/data"
import { RefreshCw, Tag, GitFork, BookOpen } from "lucide-react"

export function AboutSection() {
  const { currentVersion, latestVersion, isUpdateAvailable, isChecking } = useAppUpdate()

  return (
    <div className="p-6 space-y-6">
      <SettingsGroup label="Drivebase">
        <InfoRow icon={Tag} label="Version" value={currentVersion ?? "—"} />
        <InfoRow
          icon={RefreshCw}
          label="Latest release"
          value={
            isChecking
              ? "Checking…"
              : isUpdateAvailable
                ? `${latestVersion} — update available`
                : (latestVersion ? "Up to date" : "—")
          }
          accent={isUpdateAvailable}
        />
      </SettingsGroup>

      <SettingsGroup label="Resources">
        <LinkRow icon={GitFork}   label="GitHub"          href="https://github.com/drivebase/drivebase" />
        <LinkRow icon={BookOpen}  label="Documentation"   href="https://docs.drivebase.io" />
      </SettingsGroup>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon size={14} className="shrink-0 text-[var(--fg-subtle)]" />
      <span className="flex-1 text-sm text-[var(--fg-muted)]">{label}</span>
      <span className={`text-sm ${accent ? "font-medium text-[var(--accent)]" : "text-[var(--fg)]"}`}>
        {value}
      </span>
    </div>
  )
}

function LinkRow({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-muted)]"
    >
      <Icon size={14} className="shrink-0 text-[var(--fg-subtle)]" />
      <span className="flex-1 text-sm text-[var(--fg)]">{label}</span>
      <span className="text-xs text-[var(--fg-subtle)]">↗</span>
    </a>
  )
}
