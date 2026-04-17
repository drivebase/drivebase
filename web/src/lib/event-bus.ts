import type { AppContextTargetData } from "@/features/desktop/app-context-menu-registry";
import type { LaunchSourceRect } from "@/features/desktop/window-animation";

export type ContextTarget =
  | { type: "desktop" }
  | { type: "file"; data: { id: string; name: string; kind: string } }
  | { type: "shortcut"; data: { id: string; label: string } }
  | { type: "app"; data: AppContextTargetData }
  | null;

export type EventMap = {
  // Window events
  "window:opened": { windowId: string; appId: string };
  "window:closed": { windowId: string; appId: string };
  "window:focused": { windowId: string };

  // App events
  "app:navigate": { appId: string; path: string };

  // File events
  "file:selected": { fileId: string; source: string };
  "file:opened": { fileId: string; name: string };
  "file:deleted": { fileIds: string[] };
  "file:uploaded": { fileId: string; providerId: string };
  "file:moved": { fileId: string; from: string; to: string };

  // Provider events
  "provider:connected": { providerId: string; type: string };
  "provider:disconnected": { providerId: string };
  "provider:sync-started": { providerId: string };
  "provider:sync-completed": { providerId: string };

  // Desktop events
  "desktop:shortcut-activated": {
    shortcutId: string;
    launchSourceRect?: LaunchSourceRect;
  };
  "desktop:context-menu": {
    position: { x: number; y: number };
    target: ContextTarget;
  };

  // Selection events
  "selection:changed": { selectedIds: string[]; source: string };
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler<keyof EventMap>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(handler as Handler<keyof EventMap>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    this.listeners.get(event)?.delete(handler as Handler<keyof EventMap>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export const eventBus = new EventBus();
