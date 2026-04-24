import type { DesktopMenu, MenuItem } from "@drivebase/kernel"
import { useAuthStore } from "@drivebase/kernel"
import { signOut } from "@drivebase/data"

export function getSystemMenuItems(args: {
  onSignOut: () => Promise<void> | void
}): MenuItem[] {
  const { onSignOut } = args
  return [
    { id: "about", label: "About Drivebase" },
    { id: "settings", label: "Settings…", shortcut: "⌘," },
    {
      id: "separator-main",
      separator: true,
    },
    {
      id: "lock",
      label: "Lock screen",
      shortcut: "⌃⌘Q",
      onSelect: () => useAuthStore.getState().lock(),
    },
    {
      id: "signout",
      label: "Sign out",
      onSelect: () => {
        void (async () => {
          await signOut()
          await onSignOut()
        })()
      },
    },
    {
      id: "separator-support",
      separator: true,
    },
    {
      id: "help",
      label: "Help",
      items: [
        { id: "docs", label: "Documentation", href: "https://drivebase.io/docs" },
        { id: "github", label: "GitHub", href: "https://github.com/drivebase/drivebase" },
        { id: "support", label: "Report an issue", href: "https://github.com/drivebase/drivebase/issues" },
      ],
    },
  ]
}

/**
 * Menubar menus shown when no window is focused (desktop state).
 * Keep this empty when desktop defaults live in the brand icon menu.
 */
export const desktopMenus: DesktopMenu[] = []
