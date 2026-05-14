import { SettingsRow } from "../components/settings-row"
import { SettingsGroup } from "../components/settings-group"
import { Sun, Moon } from "lucide-react"

export function AppearanceSection() {
  return (
    <div className="p-6 space-y-6">
      <SettingsGroup label="Desktop">
        <SettingsRow
          icon={Sun}
          title="Show desktop icons"
          description="Display app icons on the desktop background"
        >
          <Toggle defaultChecked />
        </SettingsRow>
        <SettingsRow
          icon={Moon}
          title="Reduce motion"
          description="Minimize animations throughout the interface"
        >
          <Toggle />
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <div className="h-5 w-9 rounded-full bg-[var(--bg-muted)] transition-colors peer-checked:bg-[var(--accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  )
}
