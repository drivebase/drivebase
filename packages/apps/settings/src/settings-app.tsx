import { useState } from "react"
import type { AppProps } from "@drivebase/kernel"
import { GeneralSection } from "./sections/general"
import { AppearanceSection } from "./sections/appearance"
import { StorageSection } from "./sections/storage"
import { AboutSection } from "./sections/about"
import {
  Settings,
  Paintbrush,
  HardDrive,
  Info,
  Search,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  component: React.ComponentType
}

const NAV: NavItem[] = [
  { id: "general",    label: "General",    icon: Settings,   component: GeneralSection },
  { id: "appearance", label: "Appearance", icon: Paintbrush, component: AppearanceSection },
  { id: "storage",    label: "Storage",    icon: HardDrive,  component: StorageSection },
  { id: "about",      label: "About",      icon: Info,       component: AboutSection },
]

export function SettingsApp(_props: AppProps) {
  const [activeId, setActiveId] = useState(NAV[0]!.id)
  const [query, setQuery] = useState("")
  const active = NAV.find((n) => n.id === activeId) ?? NAV[0]!
  const Section = active.component

  const filtered = query.trim()
    ? NAV.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-48 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-subtle)]">
        <div className="p-2 pb-1.5">
          <label className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 focus-within:ring-1 focus-within:ring-[var(--ring)]">
            <Search size={11} className="shrink-0 text-[var(--fg-subtle)]" />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-col gap-0.5 overflow-y-auto p-2 pt-1.5">
        {filtered.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveId(item.id)}
              className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--fg-muted)]"
              }`}
            >
              <Icon size={14} className="shrink-0" />
              {item.label}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="px-2 py-2 text-xs text-[var(--fg-subtle)]">No results</p>
        )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Section />
      </main>
    </div>
  )
}
