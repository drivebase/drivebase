import { Client, cacheExchange, fetchExchange } from "urql"
import { gqlUrl } from "../config"
import { createSseExchange } from "./sse-exchange"

/**
 * Build the DriveOS urql client. Cookies are sent automatically via
 * `credentials: "include"` — Better Auth reads the session cookie on the
 * API side. Subscriptions go through graphql-sse at the same endpoint.
 */
export function createDriveClient(): Client {
  return new Client({
    url: gqlUrl(),
    fetchOptions: () => ({
      credentials: "include",
    }),
    exchanges: [cacheExchange, createSseExchange(), fetchExchange],
  })
}
