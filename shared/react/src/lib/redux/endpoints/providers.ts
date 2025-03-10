import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { ProviderListItem } from '@drivebase/internal/providers/providers';
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
  }),
});

export const { useGetAvailableProvidersQuery } = providersApi;
export default providersApi;
