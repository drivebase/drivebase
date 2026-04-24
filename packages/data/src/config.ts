/**
 * Resolves the API base URL from Vite env. Falls back to localhost so
 * codegen and tests can run without the env being set.
 */
export function getApiBaseUrl(): string {
  const url = import.meta.env?.VITE_PUBLIC_API_URL
  if (typeof url === "string" && url.length > 0) return url.replace(/\/$/, "")
  return "http://localhost:4000"
}

export const GRAPHQL_ENDPOINT = "/graphql"
export const AUTH_BASE_PATH = "/auth"

export function gqlUrl(): string {
  return `${getApiBaseUrl()}${GRAPHQL_ENDPOINT}`
}

export function authUrl(): string {
  return getApiBaseUrl()
}
