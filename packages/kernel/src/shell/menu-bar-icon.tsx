import { Menubar } from "radix-ui"
import type { MenuItem } from "../config"

function isSeparator(item: MenuItem): boolean {
  return item.separator === true
}

function openMenuItem(item: MenuItem) {
  if (item.href) {
    window.open(item.href, "_blank", "noreferrer,noopener")
    return
  }
  item.onSelect?.()
}

function submenuChevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto"
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  )
}

function MenuItemRows({ items }: { items: MenuItem[] }) {
  return (
    <>
      {items.map((item) => {
        if (isSeparator(item)) {
          return <Menubar.Separator key={item.id} className="-mx-1 my-1 h-px bg-[var(--border)]" />
        }

        if (item.items?.length) {
          return (
            <Menubar.Sub key={item.id}>
              <Menubar.SubTrigger className="relative flex cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm outline-none data-[state=open]:bg-[var(--bg-muted)] data-[highlighted]:bg-[var(--bg-muted)] data-[highlighted]:text-[var(--fg)]">
                {item.label}
                {submenuChevron()}
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent
                  className="z-[1301] min-w-[12rem] overflow-hidden rounded-[var(--radius-lg)] p-1 glass-strong window-shadow text-sm text-[var(--fg)]"
                  sideOffset={6}
                  alignOffset={-4}
                >
                  <MenuItemRows items={item.items} />
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>
          )
        }

        return (
          <Menubar.Item
            key={item.id}
            className="relative flex cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-[var(--bg-muted)] data-[highlighted]:text-[var(--fg)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            onSelect={() => openMenuItem(item)}
          >
            {item.label}
            {item.shortcut ? (
              <span className="ml-auto text-xs tracking-widest text-[var(--fg-subtle)]">
                {item.shortcut}
              </span>
            ) : null}
          </Menubar.Item>
        )
      })}
    </>
  )
}

export function MenuBarIcon({
  brandName,
  items,
}: {
  brandName: string
  items: MenuItem[]
}) {
  return (
    <Menubar.Menu>
      <Menubar.Trigger
        aria-label={`${brandName} menu`}
        className="flex items-center rounded-[var(--radius-sm)] p-1 outline-none hover:bg-[var(--bg-muted)] data-[state=open]:bg-[var(--bg-muted)]"
      >
        <img src="/circle.svg" alt={brandName} className="size-5" />
      </Menubar.Trigger>
      <Menubar.Portal>
        <Menubar.Content
          align="start"
          sideOffset={6}
          className="z-[1301] min-w-[13rem] overflow-hidden rounded-[var(--radius-lg)] p-1 glass-strong window-shadow text-sm text-[var(--fg)]"
        >
          <MenuItemRows items={items} />
        </Menubar.Content>
      </Menubar.Portal>
    </Menubar.Menu>
  )
}
