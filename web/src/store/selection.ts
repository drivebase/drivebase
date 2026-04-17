import { create } from "zustand";
import { eventBus } from "@/lib/event-bus";

interface SelectionState {
  selectedIds: string[];
  source: "file-manager" | "desktop" | null;

  select(ids: string[], source: "file-manager" | "desktop"): void;
  toggle(id: string, source: "file-manager" | "desktop"): void;
  clear(): void;
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  selectedIds: [],
  source: null,

  select(ids, source) {
    set({ selectedIds: ids, source });
    eventBus.emit("selection:changed", { selectedIds: ids, source });
  },

  toggle(id, source) {
    const current = get().selectedIds;
    const next = current.includes(id)
      ? current.filter((i) => i !== id)
      : [...current, id];
    set({ selectedIds: next, source });
    eventBus.emit("selection:changed", { selectedIds: next, source });
  },

  clear() {
    set({ selectedIds: [], source: null });
    eventBus.emit("selection:changed", { selectedIds: [], source: "" });
  },
}));
