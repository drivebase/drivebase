import { create } from "zustand";

interface FileDetailsDialogState {
	fileId: string | null;
	open: boolean;
	openForFile: (fileId: string) => void;
	close: () => void;
}

export const useFileDetailsDialogStore = create<FileDetailsDialogState>(
	(set) => ({
		fileId: null,
		open: false,
		openForFile: (fileId) => set({ fileId, open: true }),
		close: () => set({ open: false, fileId: null }),
	}),
);
