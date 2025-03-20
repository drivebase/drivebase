import { fetchBaseQuery } from '@reduxjs/toolkit/query';

const baseUrl = import.meta.env['VITE_PUBLIC_API_URL'] || '/api';

export const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers) => {
    return headers;
  },
  credentials: 'include',
});
