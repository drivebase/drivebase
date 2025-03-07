import { fetchBaseQuery } from '@reduxjs/toolkit/query';

const baseUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';

export const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers) => {
    return headers;
  },
  credentials: 'include',
});
