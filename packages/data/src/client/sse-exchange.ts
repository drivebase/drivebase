import { subscriptionExchange, type Exchange } from "urql"
import { createClient as createSSEClient } from "graphql-sse"
import { gqlUrl } from "../config"

/**
 * graphql-sse subscription exchange. Yoga serves SSE subscriptions at the
 * same `/graphql` endpoint — no `/graphql/stream` split. Distinct URL is
 * NOT required; graphql-sse negotiates via `Accept: text/event-stream`.
 */
export function createSseExchange(): Exchange {
  const sseClient = createSSEClient({
    url: gqlUrl(),
    credentials: "include",
  })

  return subscriptionExchange({
    forwardSubscription: (request) => ({
      subscribe: (sink) => {
        const dispose = sseClient.subscribe(
          {
            query: request.query ?? "",
            operationName: request.operationName ?? undefined,
            variables: request.variables ?? {},
            extensions: request.extensions ?? undefined,
          },
          sink,
        )
        return { unsubscribe: dispose }
      },
    }),
  })
}
