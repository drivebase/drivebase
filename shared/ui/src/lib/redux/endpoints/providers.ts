import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@xilehq/ui/lib/redux/base.query';
import { CallbackProviderDto } from '@xilehq/internal/providers/dtos/callback.provider.dto';
import { ApiResponse } from './api.type';

const providersApi = createApi({
  baseQuery,
  reducerPath: 'providersApi',
  endpoints: (build) => ({
    getAvailableProviders: build.query<
      ApiResponse<
        {
          type: string;
          label: string;
          logo: string;
        }[]
      >,
      void
    >({
      query: () => ({
        url: `/providers/all`,
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

export const { useGetAvailableProvidersQuery, useCallbackMutation } =
  providersApi;
export default providersApi;
