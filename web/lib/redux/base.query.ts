import { config } from '@drivebase/web/constants/config';
import { fetchBaseQuery } from '@reduxjs/toolkit/query';

const baseUrl = config.apiUrl;

export const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers) => {
    return headers;
  },
  credentials: 'include',
});
