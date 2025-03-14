import { configureStore } from '@reduxjs/toolkit';

// Reducers
import profileReducer from './reducers/profile.reducer';
import workspaceReducer from './reducers/workspace.reducer';
import uploaderReducer from './reducers/uploader.reducer';
// Endpoints
import authApi from './endpoints/auth';
import workspaceApi from './endpoints/workspaces';
import providersApi from './endpoints/providers';
import accountsApi from './endpoints/accounts';
import keysApi from './endpoints/keys';
import filesApi from './endpoints/files';

export const makeStore = () => {
  return configureStore({
    reducer: {
      profile: profileReducer,
      workspace: workspaceReducer,
      uploader: uploaderReducer,

      [authApi.reducerPath]: authApi.reducer,
      [workspaceApi.reducerPath]: workspaceApi.reducer,
      [providersApi.reducerPath]: providersApi.reducer,
      [accountsApi.reducerPath]: accountsApi.reducer,
      [keysApi.reducerPath]: keysApi.reducer,
      [filesApi.reducerPath]: filesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authApi.middleware,
        workspaceApi.middleware,
        providersApi.middleware,
        accountsApi.middleware,
        keysApi.middleware,
        filesApi.middleware
      ),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
