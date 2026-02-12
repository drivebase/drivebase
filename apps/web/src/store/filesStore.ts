import { create } from "zustand";

interface FilesState {
	viewMode: "list" | "grid";
	sortOrder: "name" | "date" | "size";
	filterType: "all" | "document" | "image" | "video" | "audio";
	searchQuery: string;
	setViewMode: (mode: "list" | "grid") => void;
	setSortOrder: (order: "name" | "date" | "size") => void;
	setFilterType: (
		type: "all" | "document" | "image" | "video" | "audio",
	) => void;
	setSearchQuery: (query: string) => void;
}

export const useFilesStore = create<FilesState>((set) => ({
	viewMode: "grid",
	sortOrder: "date",
	filterType: "all",
	searchQuery: "",
	setViewMode: (mode) => set({ viewMode: mode }),
	setSortOrder: (order) => set({ sortOrder: order }),
	setFilterType: (type) => set({ filterType: type }),
	setSearchQuery: (query) => set({ searchQuery: query }),
}));