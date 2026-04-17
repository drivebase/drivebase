import { useEffect } from "react";
import type { RefObject } from "react";
import { useContextMenuStore } from "@/store/context-menu";
import { eventBus } from "@/lib/event-bus";
import type { ContextTarget } from "@/lib/event-bus";

export function useContextMenu(ref: RefObject<HTMLElement | null>): void {
  const open = useContextMenuStore((s) => s.open);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleContextMenu(e: MouseEvent) {
      const targetEl = e.target as Element;
      const position = { x: e.clientX, y: e.clientY };
      const contextEl = targetEl.closest("[data-context-type]");
      const windowEl = targetEl.closest("[data-window-root='true']");

      let target: ContextTarget;

      if (contextEl) {
        const type = contextEl.getAttribute("data-context-type");
        const rawData = contextEl.getAttribute("data-context-data");
        const data = rawData ? JSON.parse(rawData) : undefined;

        if (type === "file" && data) {
          target = { type: "file", data };
        } else if (type === "shortcut" && data) {
          target = { type: "shortcut", data };
        } else if (type === "app" && data) {
          target = { type: "app", data };
        } else {
          return;
        }
      } else if (windowEl) {
        return;
      } else {
        target = { type: "desktop" };
      }

      e.preventDefault();
      open(position, target);
      eventBus.emit("desktop:context-menu", { position, target });
    }

    el.addEventListener("contextmenu", handleContextMenu);
    return () => el.removeEventListener("contextmenu", handleContextMenu);
  }, [ref, open]);
}
