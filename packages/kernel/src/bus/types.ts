/**
 * Typed event map for the DriveOS event bus.
 *
 * All cross-cutting shell events flow through this bus. Apps can listen to any
 * subset they care about; the kernel itself also reacts to emit side effects
 * (e.g. `app.launch` → open a window).
 */
export type KernelEventMap = {
  // Windows
  "window.open": { windowId: string; appId: string; payload?: unknown }
  "window.close": { windowId: string }
  "window.focus": { windowId: string }
  "window.minimize": { windowId: string }
  "window.maximize": { windowId: string }
  "window.move": { windowId: string; x: number; y: number }
  "window.resize": { windowId: string; w: number; h: number }

  // Apps
  "app.launch": { appId: string; payload?: unknown }
  "app.quit": { appId: string; windowId?: string }

  // UI
  "menu.invoke": { menuId: string; itemId: string }
  "command.invoke": { commandId: string; source?: "palette" | "menu" | "shortcut" }
  "context-menu.open": { zone: string; x: number; y: number; context?: unknown }
  toast: { kind: "info" | "success" | "warning" | "danger"; title: string; desc?: string }

  // Theme / layout
  "theme.change": { theme: "light" | "dark" }
  "wallpaper.change": { variant: string }

  // Files
  "files.refresh": void

  // Transfers
  "transfer.open": void
  "transfer.start": { operationId: string }
  "transfer.progress": { operationId: string; progress: number }
  "transfer.done": { operationId: string }
  "transfer.error": { operationId: string; message: string }

  // Auth
  "auth.login": { userId: string }
  "auth.logout": void
  "auth.lock": void
  "auth.unlock": void
}

export type KernelEventName = keyof KernelEventMap
