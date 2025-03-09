import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { Workspace } from '@prisma/client';

export interface WorkspaceState {
  workspace: Workspace | null;
}

const workspaceInitialState: WorkspaceState = {
  workspace: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: workspaceInitialState,
  reducers: {
    setWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspace = action.payload;
    },
  },
});

export const { setWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;
