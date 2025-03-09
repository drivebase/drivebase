import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { UserPublicData } from '@drivebase/internal/users/users.validator';

export interface ProfileState {
  user: UserPublicData | null;
}

const profileInitialState: ProfileState = {
  user: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState: profileInitialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserPublicData>) => {
      state.user = action.payload;
    },
  },
});

export const { setUser } = profileSlice.actions;
export default profileSlice.reducer;
