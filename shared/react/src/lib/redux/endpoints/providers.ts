import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { ProviderListItem } from '@drivebase/internal/providers/providers';
import { ApiResponse } from './api.type';
import { Provider, ProviderType } from '@prisma/client';
import { CallbackProviderDto } from '@drivebase/internal/providers/dtos/callback.provider.dto';
import { AuthorizeAPIProviderDto } from '@drivebase/internal/providers/dtos/auth.provider.dto';

const providersApi = createApi({
  baseQuery,
  reducerPath: 'providersApi',
  endpoints: (build) => ({
    getAvailableProviders: build.query<ApiResponse<ProviderListItem[]>, void>({
      query: () => ({
        url: `/providers/available`,
        method: 'GET',
      }),
    }),
    getProviders: build.query<ApiResponse<Provider[]>, void>({
      query: () => ({
        url: `/providers`,
        method: 'GET',
      }),
    }),
    getAuthUrl: build.mutation<
      ApiResponse<string>,
      {
        type: ProviderType;
        clientId?: string;
        clientSecret?: string;
      }
    >({
      query: ({ type, clientId, clientSecret }) => ({
        url: `/providers/oauth/redirect?type=${type}&clientId=${clientId}&clientSecret=${clientSecret}`,
        method: 'GET',
      }),
    }),
    callback: build.mutation<void, CallbackProviderDto>({
      query: (body) => ({
        url: `/providers/oauth/callback`,
        method: 'POST',
        body,
      }),
    }),
    authorizeApiKey: build.mutation<void, AuthorizeAPIProviderDto>({
      query: (body) => ({
        url: `/providers/api-key/authorize`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Providers'],
    }),
  }),
});

export const {
  useGetAvailableProvidersQuery,
  useGetProvidersQuery,
  useGetAuthUrlMutation,
  useCallbackMutation,
  useAuthorizeApiKeyMutation,
} = providersApi;
export default providersApi;
