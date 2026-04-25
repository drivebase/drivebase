import { useEffect, useState } from "react"
import { Menubar } from "radix-ui"
import { useThemeStore } from "../stores/theme-store"
import { useWindowStore } from "../stores/window-store"
import { useWindowCommandStore } from "../stores/window-command-store"
import { useWindowMenuStore } from "../stores/window-menu-store"
import { useAppRegistryStore } from "../stores/app-registry-store"
import { useKernelConfig, type DesktopMenu, type MenuItem } from "../config"
import { MenuBarIcon } from "./menu-bar-icon"

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  const date = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  return `${date}  ${time}`
}

/**
 * Top menubar. When a window is focused it shows that app's name (bold) plus
 * any menu contributions the manifest declared. When nothing is focused it
 * falls back to the `desktopMenus` passed into `<KernelProvider config>` —
 * fully configurable (Settings / Docs / GitHub / whatever).
 */
export function MenuBar() {
  const clock = useClock()
  const toggleTheme = useThemeStore((s) => s.toggle)
  const theme = useThemeStore((s) => s.theme)
  const focusedId = useWindowStore((s) => s.focusedId)
  const closeWindow = useWindowStore((s) => s.close)
  const invokeWindowCommand = useWindowCommandStore((s) => s.invoke)
  const win = useWindowStore((s) => (focusedId ? s.windows[focusedId] : null))
  const activeApp = useAppRegistryStore((s) => (win ? s.apps[win.appId] : null))
  const windowMenus = useWindowMenuStore((s) => (focusedId ? s.menusByWindowId[focusedId] ?? null : null))
  const { brandName, systemMenuItems, MenuBarExtra } = useKernelConfig()

  const appMenu: DesktopMenu | null = activeApp && focusedId
    ? {
        id: "__app__",
        label: activeApp.name,
        items: [
          { id: "about", label: `About ${activeApp.name}` },
          { id: "quit", label: `Quit ${activeApp.name}`, shortcut: "⌘Q", onSelect: () => closeWindow(focusedId) },
        ],
      }
    : null

  const menus: DesktopMenu[] = activeApp
    ? (windowMenus ?? activeApp.menuContributions ?? []).map((m) => ({
        id: m.id,
        label: m.label,
        items: m.items,
      }))
    : []

  return (
    <div className="glass-strong fixed inset-x-0 top-0 z-[1300] flex h-(--menubar-h) items-center gap-1 border-b border-[var(--border)] px-2 text-[12.5px] text-[var(--fg)]">
      <Menubar.Root className="flex items-center gap-0.5">
        <MenuBarIcon brandName={brandName} items={systemMenuItems} />
        {appMenu && (
          <DesktopMenuEntry key="__app__" menu={appMenu} triggerClassName="font-semibold" />
        )}
        {menus.map((m) => <DesktopMenuEntry key={m.id} menu={m} windowId={focusedId} onInvokeCommand={invokeWindowCommand} />)}
      </Menubar.Root>

      <div className="ml-auto flex items-center gap-4 px-2 text-[var(--fg-muted)]">
        {MenuBarExtra && <MenuBarExtra />}
        <button type="button" onClick={toggleTheme} className="hover:text-[var(--fg)]">
          {theme === "dark" ? "☾" : "☀"}
        </button>
        <span className="font-mono tabular-nums">{clock}</span>
      </div>
    </div>
  )
}

function DesktopMenuEntry({
  menu,
  triggerClassName,
  windowId,
  onInvokeCommand,
}: {
  menu: DesktopMenu
  triggerClassName?: string
  windowId?: string | null
  onInvokeCommand?: (windowId: string, commandId: string) => void | Promise<void>
}) {
  if (menu.href && !menu.items) {
    return (
      <a
        href={menu.href}
        target="_blank"
        rel="noreferrer noopener"
        className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)]"
      >
        {menu.label}
      </a>
    )
  }

  const items = menu.items ?? []
  return (
    <Menubar.Menu>
      <Menubar.Trigger className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[var(--fg-muted)] outline-none hover:bg-[var(--bg-muted)] hover:text-[var(--fg)] data-[state=open]:bg-[var(--bg-muted)] data-[state=open]:text-[var(--fg)] ${triggerClassName ?? ""}`}>
        {menu.label}
      </Menubar.Trigger>
      <Menubar.Portal>
        <Menubar.Content
          align="start"
          sideOffset={6}
          alignOffset={0}
          className="z-[1301] min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] p-1 glass-strong window-shadow text-sm text-[var(--fg)]"
        >
          {items.map((item) => (
            <MenuItemRow key={item.id} item={item} windowId={windowId} onInvokeCommand={onInvokeCommand} />
          ))}
        </Menubar.Content>
      </Menubar.Portal>
    </Menubar.Menu>
  )
}

function MenuItemRow({
  item,
  windowId,
  onInvokeCommand,
}: {
  item: MenuItem
  windowId?: string | null
  onInvokeCommand?: (windowId: string, commandId: string) => void | Promise<void>
}) {
  if (item.separator) {
    return <Menubar.Separator className="-mx-1 my-1 h-px bg-[var(--border)]" />
  }

  if (item.items?.length) {
    return (
      <Menubar.Sub>
        <Menubar.SubTrigger
          disabled={item.disabled}
          className="relative flex cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm outline-none data-[state=open]:bg-[var(--bg-muted)] data-[highlighted]:bg-[var(--bg-muted)] data-[highlighted]:text-[var(--fg)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        >
          {item.label}
          <span className="ml-auto">›</span>
        </Menubar.SubTrigger>
        <Menubar.Portal>
          <Menubar.SubContent
            className="z-[1301] min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] p-1 glass-strong window-shadow text-sm text-[var(--fg)]"
            sideOffset={6}
            alignOffset={-4}
          >
            {item.items.map((child) => (
              <MenuItemRow key={child.id} item={child} windowId={windowId} onInvokeCommand={onInvokeCommand} />
            ))}
          </Menubar.SubContent>
        </Menubar.Portal>
      </Menubar.Sub>
    )
  }

  return (
    <Menubar.Item
      disabled={item.disabled}
      className="relative flex cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-[var(--bg-muted)] data-[highlighted]:text-[var(--fg)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      onSelect={() => {
        if (item.href) {
          window.open(item.href, "_blank", "noreferrer,noopener")
          return
        }
        if (windowId && item.commandId && onInvokeCommand) {
          void onInvokeCommand(windowId, item.commandId)
          return
        }
        item.onSelect?.()
      }}
    >
      {item.label}
      {item.shortcut && (
        <span className="ml-auto text-xs tracking-widest text-[var(--fg-subtle)]">
          {item.shortcut}
        </span>
      )}
    </Menubar.Item>
  )
}
