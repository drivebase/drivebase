import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { CallbackProviderDto } from '@drivebase/internal/providers/dtos/callback.provider.dto';
import { ProviderListItem } from '@drivebase/internal/providers/providers';
import { ProviderType } from '@prisma/client';
import { ApiResponse } from './api.type';

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
    getAuthUrl: build.mutation<
      ApiResponse<string>,
      {
        workspaceId: string;
        type: ProviderType;
      }
    >({
      query: ({ workspaceId, type }) => ({
        url: `/providers/auth?workspaceId=${workspaceId}&type=${type}`,
        method: 'GET',
      }),
    }),
    callback: build.mutation<void, CallbackProviderDto>({
      query: (body) => ({
        url: `/providers/callback`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetAvailableProvidersQuery,
  useCallbackMutation,
  useGetAuthUrlMutation,
} = providersApi;
export default providersApi;
