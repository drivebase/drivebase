import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface FilesState {
	viewMode: "table" | "grid";
	sortOrder: "name" | "date" | "size";
	filterType: "all" | "document" | "image" | "video" | "audio";
	searchQuery: string;
	setViewMode: (mode: "table" | "grid") => void;
	setSortOrder: (order: "name" | "date" | "size") => void;
	setFilterType: (
		type: "all" | "document" | "image" | "video" | "audio",
	) => void;
	setSearchQuery: (query: string) => void;
}

export const useFilesStore = create<FilesState>()(
	persist(
		(set) => ({
			viewMode: "table",
			sortOrder: "date",
			filterType: "all",
			searchQuery: "",
			setViewMode: (mode) => set({ viewMode: mode }),
			setSortOrder: (order) => set({ sortOrder: order }),
			setFilterType: (type) => set({ filterType: type }),
			setSearchQuery: (query) => set({ searchQuery: query }),
		}),
		{
			name: "drivebase-files-preferences",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({ viewMode: state.viewMode }),
		},
	),
);
