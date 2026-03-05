import type { ReactNode } from "react";
import { create } from "zustand";

const RIGHT_PANEL_COLLAPSED_STORAGE_KEY = "right_panel_collapsed";

interface RightPanelState {
	content: ReactNode | null;
	setContent: (content: ReactNode) => void;
	clearContent: () => void;
	// whether the panel has been collapsed by the user
	collapsed: boolean;
	setCollapsed: (next: boolean) => void;
	toggleCollapsed: () => void;
}

function getInitialCollapsed(): boolean {
	if (typeof window === "undefined") return false;
	return localStorage.getItem(RIGHT_PANEL_COLLAPSED_STORAGE_KEY) === "true";
}

export const useRightPanelStore = create<RightPanelState>((set) => ({
	content: null,
	setContent: (content) => set({ content }),
	clearContent: () => set({ content: null }),
	collapsed: getInitialCollapsed(),
	setCollapsed: (next) => {
		if (typeof window !== "undefined") {
			localStorage.setItem(
				RIGHT_PANEL_COLLAPSED_STORAGE_KEY,
				next ? "true" : "false",
			);
		}
		set({ collapsed: next });
	},
	toggleCollapsed: () =>
		set((state) => {
			const next = !state.collapsed;
			if (typeof window !== "undefined") {
				localStorage.setItem(
					RIGHT_PANEL_COLLAPSED_STORAGE_KEY,
					next ? "true" : "false",
				);
			}
			return { collapsed: next };
		}),
}));
