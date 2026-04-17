import { create } from "zustand";

export type DesktopSortBy = "name" | "type";

interface DesktopPreferencesState {
	useStacks: boolean;
	sortBy: DesktopSortBy;
	toggleStacks: () => void;
	setSortBy: (sortBy: DesktopSortBy) => void;
}

export const useDesktopPreferencesStore = create<DesktopPreferencesState>()(
	(set) => ({
		useStacks: false,
		sortBy: "name",
		toggleStacks: () => set((state) => ({ useStacks: !state.useStacks })),
		setSortBy: (sortBy) => set({ sortBy }),
	}),
);
