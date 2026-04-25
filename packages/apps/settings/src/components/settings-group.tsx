import type { ReactNode } from "react"

export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-subtle)]">
        {label}
      </p>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] divide-y divide-[var(--border)]">
        {children}
      </div>
    </div>
  )
}
