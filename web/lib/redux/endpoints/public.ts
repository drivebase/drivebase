import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQuery } from '../base.query';
import { ApiResponse } from './api.type';

export const publicApi = createApi({
  baseQuery,
  endpoints: (builder) => ({
    getVersion: builder.query<ApiResponse<string>, void>({
      query: () => '/public/version',
    }),
  }),
});

export const { useGetVersionQuery } = publicApi;
export default publicApi;
