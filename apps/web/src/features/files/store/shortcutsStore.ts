import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Default shortcut mappings: keyboard key → action ID */
const DEFAULT_SHORTCUTS: Record<string, string> = {
	Delete: "delete",
	Backspace: "delete",
	F2: "rename-file",
	"Ctrl+D": "download",
	"Meta+D": "download",
	"Ctrl+A": "select-all",
	"Meta+A": "select-all",
	Escape: "clear-selection",
};

interface ShortcutsState {
	shortcuts: Record<string, string>;
	getActionId: (key: string) => string | undefined;
	setShortcut: (key: string, actionId: string) => void;
	removeShortcut: (key: string) => void;
	resetDefaults: () => void;
}

export const useShortcutsStore = create<ShortcutsState>()(
	persist(
		(set, get) => ({
			shortcuts: { ...DEFAULT_SHORTCUTS },
			getActionId: (key: string) => get().shortcuts[key],
			setShortcut: (key, actionId) =>
				set((state) => ({
					shortcuts: { ...state.shortcuts, [key]: actionId },
				})),
			removeShortcut: (key) =>
				set((state) => {
					const next = { ...state.shortcuts };
					delete next[key];
					return { shortcuts: next };
				}),
			resetDefaults: () => set({ shortcuts: { ...DEFAULT_SHORTCUTS } }),
		}),
		{
			name: "drivebase-keyboard-shortcuts",
			storage: createJSONStorage(() => localStorage),
		},
	),
);
