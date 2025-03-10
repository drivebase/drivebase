import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { CallbackProviderDto } from '@drivebase/internal/providers/dtos/callback.provider.dto';
import { Account, ProviderType } from '@prisma/client';
import { ApiResponse } from './api.type';

const accountsApi = createApi({
  baseQuery,
  reducerPath: 'accountsApi',
  endpoints: (build) => ({
    getConnectedAccounts: build.query<ApiResponse<Account[]>, void>({
      query: () => ({
        url: `/accounts`,
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
        url: `/accounts/auth?workspaceId=${workspaceId}&type=${type}`,
        method: 'GET',
      }),
    }),
    callback: build.mutation<void, CallbackProviderDto>({
      query: (body) => ({
        url: `/accounts/callback`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useCallbackMutation,
  useGetAuthUrlMutation,
  useGetConnectedAccountsQuery,
} = accountsApi;
export default accountsApi;
