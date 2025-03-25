import { UserPublicData } from '@drivebase/users/users.validator';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

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
