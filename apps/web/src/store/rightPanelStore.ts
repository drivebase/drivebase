import type { ReactNode } from "react";
import { create } from "zustand";

interface RightPanelState {
	content: ReactNode | null;
	setContent: (content: ReactNode) => void;
	clearContent: () => void;
}

export const useRightPanelStore = create<RightPanelState>((set) => ({
	content: null,
	setContent: (content) => set({ content }),
	clearContent: () => set({ content: null }),
}));
