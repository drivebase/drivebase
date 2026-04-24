import { cn } from "@drivebase/ui/lib/cn"
import { useDesktopShortcutStore } from "@drivebase/kernel"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@drivebase/ui/components/context-menu"
import { useBus } from "@drivebase/kernel/bus"
import type { MyProvidersQuery } from "@drivebase/data/gql"
import { providerIconClass } from "../provider-icons"
import type { FilesAppPayload } from "../files-app"

type Provider = MyProvidersQuery["myProviders"][number]

export interface LocationsSidebarProps {
  providers: Provider[]
  selectedProviderId: string | null
  onSelect: (provider: Provider) => void
  fetching: boolean
}

export function LocationsSidebar({
  providers,
  selectedProviderId,
  onSelect,
  fetching,
}: LocationsSidebarProps) {
  const bus = useBus()
  const providerShortcutIds = useDesktopShortcutStore((s) => s.providerShortcutIds)
  const addProviderShortcut = useDesktopShortcutStore((s) => s.addProviderShortcut)
  const removeProviderShortcut = useDesktopShortcutStore((s) => s.removeProviderShortcut)

  return (
    <aside className="flex w-44 shrink-0 flex-col gap-1 border-r border-[var(--border)] px-2 py-2">
      <div className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--fg-subtle)]">
        Locations
      </div>
      {fetching && providers.length === 0 ? (
        <div className="px-2 text-xs text-[var(--fg-muted)]">Loading…</div>
      ) : providers.length === 0 ? (
        <div className="px-2 text-xs text-[var(--fg-muted)]">
          No providers connected.
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {providers.map((p) => {
            const active = p.id === selectedProviderId
            const hasDesktopShortcut = providerShortcutIds.includes(p.id)
            return (
              <li key={p.id}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onSelect(p)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-[var(--accent-soft)] text-[var(--accent-soft-fg)]"
                          : "text-[var(--fg)] hover:bg-[var(--bg-subtle)]",
                      )}
                    >
                      <span
                        className={`inline-block size-4 ${providerIconClass(p.type)}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{p.label}</span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onSelect={() => {
                        const payload: FilesAppPayload = {
                          providerId: p.id,
                          path: [{ id: null, name: p.label }],
                        }
                        bus.emit("app.launch", { appId: "files", payload })
                      }}
                    >
                      Open in New Window
                    </ContextMenuItem>
                    {hasDesktopShortcut ? (
                      <ContextMenuItem onSelect={() => removeProviderShortcut(p.id)}>
                        Remove from Desktop
                      </ContextMenuItem>
                    ) : (
                      <ContextMenuItem onSelect={() => addProviderShortcut(p.id)}>
                        Add to Desktop
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem disabled className="text-[var(--danger)]">
                      Disconnect
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
