import { create } from "zustand";
import type { ContextTarget } from "@/lib/event-bus";

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  target: ContextTarget;

  open(position: { x: number; y: number }, target: ContextTarget): void;
  close(): void;
}

export const useContextMenuStore = create<ContextMenuState>()((set) => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  target: null,

  open(position, target) {
    set({ isOpen: true, position, target });
  },

  close() {
    set({ isOpen: false, target: null });
  },
}));
