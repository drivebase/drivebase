import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { Provider, ProviderType } from '@prisma/client';
import { ApiResponse } from './api.type';

const keysApi = createApi({
  baseQuery,
  reducerPath: 'keysApi',
  endpoints: (build) => ({
    getKeys: build.query<ApiResponse<Provider[]>, void>({
      query: () => ({
        url: `/keys `,
        method: 'GET',
      }),
    }),
    saveKeys: build.mutation<
      ApiResponse<Provider>,
      {
        type: ProviderType;
        keys: Record<string, string>;
      }
    >({
      query: ({ type, keys }) => ({
        url: `/keys`,
        method: 'PUT',
        body: { keys, type },
      }),
    }),
  }),
});

export const { useGetKeysQuery, useSaveKeysMutation } = keysApi;
export default keysApi;
