import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@drivebase/ui/components/context-menu"
import { cn } from "@drivebase/ui/lib/cn"
import type { ReactNode } from "react"
import {
  getContextMenuEntries,
  isContextMenuSeparator,
  type ContextMenuZoneId,
} from "./context-menu-registry"

export interface ContextMenuZoneProps<Payload> {
  zone: ContextMenuZoneId
  /**
   * Passed to every factory when the menu opens. Callers should freeze it
   * (e.g. memoize) to avoid unnecessary recalculation, though the payload
   * is only read when the menu actually triggers.
   */
  payload: Payload
  children: ReactNode
  /** Forwarded to the trigger; the trigger wraps children via `asChild`. */
  className?: string
  /**
   * When `asChild` is true (default), the child element becomes the context
   * trigger. Set `false` to wrap in a styled div — useful for background
   * zones where the child is already the full drop target.
   */
  asChild?: boolean
}

/**
 * Drop-in right-click surface. Collects entries from every registered
 * factory for this zone at open time (not at render) so the menu reflects
 * the latest registrations — matters for HMR and for apps that register
 * from inside React effects.
 */
export function ContextMenuZone<Payload>({
  zone,
  payload,
  children,
  className,
  asChild = true,
}: ContextMenuZoneProps<Payload>) {
  // Radix's ContextMenuTrigger renders as a `<span>` (inline) when asChild
  // is false — which kills `flex-1 overflow-y-auto` on background zones.
  // To keep layout predictable we always use `asChild` and wrap non-asChild
  // cases in our own `<div>` so the supplied className applies to a real
  // block-level element that receives the contextmenu event.
  return (
    <ContextMenu>
      {asChild ? (
        <ContextMenuTrigger asChild className={className}>
          {children}
        </ContextMenuTrigger>
      ) : (
        <ContextMenuTrigger asChild>
          <div className={className}>{children}</div>
        </ContextMenuTrigger>
      )}
      <ContextMenuContent>
        <ContextMenuZoneBody zone={zone} payload={payload} />
      </ContextMenuContent>
    </ContextMenu>
  )
}

/**
 * Rendered inside the ContextMenuContent. Splitting the body lets Radix
 * keep the portal logic and lets us re-collect entries on each open
 * (payload may have changed since the last render).
 */
function ContextMenuZoneBody<Payload>({
  zone,
  payload,
}: {
  zone: ContextMenuZoneId
  payload: Payload
}) {
  const entries = getContextMenuEntries(zone, payload)
  if (entries.length === 0) {
    return (
      <ContextMenuItem disabled className="text-[var(--fg-subtle)]">
        No actions
      </ContextMenuItem>
    )
  }
  return (
    <>
      {entries.map((entry) =>
        isContextMenuSeparator(entry) ? (
          <ContextMenuSeparator key={entry.id} />
        ) : (
          <ContextMenuItem
            key={entry.id}
            disabled={entry.disabled}
            onSelect={() => {
              void entry.onSelect()
            }}
            className={cn(entry.destructive && "text-[var(--danger)]")}
          >
            {entry.icon ? (
              <span className="flex size-4 shrink-0 items-center justify-center">
                {entry.icon}
              </span>
            ) : null}
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.shortcut ? (
              <ContextMenuShortcut>{entry.shortcut}</ContextMenuShortcut>
            ) : null}
          </ContextMenuItem>
        ),
      )}
    </>
  )
}
