import { configureStore } from '@reduxjs/toolkit';

// Reducers
import profileReducer from './reducers/profile.reducer';

// Endpoints
import authApi from './endpoints/auth';

export const makeStore = () => {
  return configureStore({
    reducer: {
      profile: profileReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
