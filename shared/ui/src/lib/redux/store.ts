import { configureStore } from '@reduxjs/toolkit';

// Reducers
import profileReducer from './reducers/profile.reducer';

// Endpoints
import authApi from './endpoints/auth';
import workspaceApi from './endpoints/workspaces';
import providersApi from './endpoints/providers';

export const makeStore = () => {
  return configureStore({
    reducer: {
      profile: profileReducer,
      [authApi.reducerPath]: authApi.reducer,
      [workspaceApi.reducerPath]: workspaceApi.reducer,
      [providersApi.reducerPath]: providersApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authApi.middleware,
        workspaceApi.middleware,
        providersApi.middleware
      ),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
