import { useQuery } from "urql"
import { ViewerDocument, type ViewerQuery } from "../gql"

/**
 * Reactive viewer query. Returns the currently authenticated user (or null)
 * and the standard urql fetching flags. Re-runs whenever the cookie session
 * changes (after login/logout the caller should `reexecuteQuery` or we
 * revalidate via a `network-only` requestPolicy as needed).
 */
export function useViewer() {
  const [result, refetch] = useQuery<ViewerQuery>({
    query: ViewerDocument,
    requestPolicy: "cache-and-network",
  })
  return {
    viewer: result.data?.viewer ?? null,
    fetching: result.fetching,
    error: result.error,
    refetch: () => refetch({ requestPolicy: "network-only" }),
  }
}
