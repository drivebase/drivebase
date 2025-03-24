import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/redux/base.query';
import { ApiResponse } from './api.type';
import { User } from '@prisma/client';

const profileApi = createApi({
  baseQuery,
  reducerPath: 'profileApi',
  endpoints: (build) => ({
    getProfile: build.query<ApiResponse<User>, void>({
      query: () => ({
        url: '/auth/profile',
      }),
    }),
  }),
});

export const { useGetProfileQuery } = profileApi;
export default profileApi;
