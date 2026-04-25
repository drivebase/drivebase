import { SettingsRow } from "../components/settings-row"
import { SettingsGroup } from "../components/settings-group"
import { FolderSync, Trash2, Archive } from "lucide-react"

export function StorageSection() {
  return (
    <div className="p-6 space-y-6">
      <SettingsGroup label="Sync">
        <SettingsRow
          icon={FolderSync}
          title="Auto-sync on open"
          description="Refresh remote file listings when opening a folder"
        >
          <Toggle defaultChecked />
        </SettingsRow>
        <SettingsRow
          icon={Archive}
          title="Cache duration"
          description="How long folder listings are cached locally"
        >
          <Select options={["30 seconds", "1 minute", "5 minutes", "10 minutes"]} value="1 minute" />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup label="Cleanup">
        <SettingsRow
          icon={Trash2}
          title="Clear local cache"
          description="Remove all cached file listings and thumbnails"
        >
          <button
            type="button"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--danger)]/50 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
          >
            Clear cache
          </button>
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
