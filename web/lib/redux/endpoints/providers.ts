import { AuthorizeAPIProviderDto } from '@drivebase/providers/dtos/auth.provider.dto';
import { CallbackProviderDto } from '@drivebase/providers/dtos/callback.provider.dto';
import { ProviderFile } from '@drivebase/providers/provider.interface';
import { ProviderListItem } from '@drivebase/providers/providers';
import { baseQuery } from '@drivebase/web/lib/redux/base.query';
import { Provider, ProviderType } from '@prisma/client';
import { createApi } from '@reduxjs/toolkit/query/react';

import { ApiResponse } from './api.type';

const providersApi = createApi({
  baseQuery,
  reducerPath: 'providersApi',
  tagTypes: ['Providers'],
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
    listProviderFiles: build.query<
      ApiResponse<ProviderFile[]>,
      { providerId: string; path?: string }
    >({
      query: ({ providerId, path }) => ({
        url: `/providers/${providerId}/files?path=${path}`,
        method: 'GET',
      }),
    }),
    updateProviderMetadata: build.mutation<
      ApiResponse<Provider>,
      {
        providerId: string;
        metadata: Record<string, unknown>;
      }
    >({
      query: ({ providerId, metadata }) => ({
        url: `/providers/${providerId}/metadata`,
        method: 'PATCH',
        body: { metadata },
      }),
      invalidatesTags: ['Providers'],
    }),
    updateProviderLabel: build.mutation<
      ApiResponse<Provider>,
      {
        providerId: string;
        label: string;
      }
    >({
      query: ({ providerId, label }) => ({
        url: `/providers/${providerId}`,
        method: 'PATCH',
        body: { label },
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
  useListProviderFilesQuery,
  useUpdateProviderMetadataMutation,
  useUpdateProviderLabelMutation,
} = providersApi;
export default providersApi;
