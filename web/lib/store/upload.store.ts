import { create } from 'zustand';

interface UploadState {
  uploadModalOpen: boolean;
  fileIds: string[];
  setUploadModalOpen: (open: boolean) => void;
  clearFileIds: () => void;
  addFileId: (id: string) => void;
  removeFileId: (id: string) => void;
  setFileIds: (ids: string[]) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  uploadModalOpen: false,
  fileIds: [],
  setUploadModalOpen: (open) => set({ uploadModalOpen: open }),
  clearFileIds: () => set({ fileIds: [] }),
  addFileId: (id) => set((state) => ({ fileIds: [...state.fileIds, id] })),
  removeFileId: (id) =>
    set((state) => ({ fileIds: state.fileIds.filter((fileId) => fileId !== id) })),
  setFileIds: (ids) => set({ fileIds: ids }),
}));
