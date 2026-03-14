const envBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL;

const normalizedBaseUrl = envBaseUrl?.replace(/\/+$/, "");

export const APP_URL = normalizedBaseUrl || "";
export const GRAPHQL_API_URL = APP_URL ? `${APP_URL}/graphql` : "/graphql";
