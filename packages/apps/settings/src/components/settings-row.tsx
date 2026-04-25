import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

interface SettingsRowProps {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
}

export function SettingsRow({ icon: Icon, title, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={14} className="shrink-0 text-[var(--fg-subtle)]" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-[var(--fg)]">{title}</div>
        {description && (
          <div className="mt-0.5 text-xs text-[var(--fg-muted)]">{description}</div>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  )
}
