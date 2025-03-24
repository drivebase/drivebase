import { createSlice } from '@reduxjs/toolkit';

export interface UploaderState {
  uploadModalOpen: boolean;
  fileIds: string[];
}

const initialState: UploaderState = {
  uploadModalOpen: false,
  fileIds: [],
};

const uploaderSlice = createSlice({
  name: 'uploader',
  initialState,
  reducers: {
    setUploadModalOpen: (state, action) => {
      state.uploadModalOpen = action.payload;
    },
    setFileIds: (state, action: { payload: string[] }) => {
      state.fileIds = action.payload;
    },
    clearFileIds: (state) => {
      state.fileIds = [];
    },
  },
});

export const { setUploadModalOpen, setFileIds, clearFileIds } =
  uploaderSlice.actions;
export default uploaderSlice.reducer;
