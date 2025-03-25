export const config = {
  apiUrl: import.meta.env.PROD
    ? '/api'
    : import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:8000',
};
