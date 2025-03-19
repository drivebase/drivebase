import { configureStore } from '@reduxjs/toolkit';

// Reducers
import profileReducer from './reducers/profile.reducer';
import workspaceReducer from './reducers/workspace.reducer';
import uploaderReducer from './reducers/uploader.reducer';
// Endpoints
import authApi from './endpoints/auth';
import workspaceApi from './endpoints/workspaces';
import providersApi from './endpoints/providers';
import filesApi from './endpoints/files';
import profileApi from './endpoints/profile';
import publicApi from './endpoints/public';

export const makeStore = () => {
  return configureStore({
    reducer: {
      profile: profileReducer,
      workspace: workspaceReducer,
      uploader: uploaderReducer,

      [authApi.reducerPath]: authApi.reducer,
      [workspaceApi.reducerPath]: workspaceApi.reducer,
      [providersApi.reducerPath]: providersApi.reducer,
      [filesApi.reducerPath]: filesApi.reducer,
      [profileApi.reducerPath]: profileApi.reducer,
      [publicApi.reducerPath]: publicApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authApi.middleware,
        workspaceApi.middleware,
        providersApi.middleware,
        filesApi.middleware,
        profileApi.middleware,
        publicApi.middleware
      ),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
