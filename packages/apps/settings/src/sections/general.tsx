import { SettingsRow } from "../components/settings-row"
import { SettingsGroup } from "../components/settings-group"
import { Bell, Globe, Clock } from "lucide-react"

export function GeneralSection() {
  return (
    <div className="p-6 space-y-6">
      <SettingsGroup label="Notifications">
        <SettingsRow
          icon={Bell}
          title="Desktop notifications"
          description="Show alerts for completed transfers and uploads"
        >
          <Toggle defaultChecked />
        </SettingsRow>
        <SettingsRow
          icon={Clock}
          title="Transfer completion sound"
          description="Play a sound when a transfer finishes"
        >
          <Toggle />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup label="Language & Region">
        <SettingsRow
          icon={Globe}
          title="Language"
          description="Interface display language"
        >
          <Select options={["English", "Spanish", "French", "German"]} value="English" />
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

function Select({ options, value }: { options: string[]; value: string }) {
  return (
    <select
      defaultValue={value}
      className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
}
