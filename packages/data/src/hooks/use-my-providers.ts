import { useQuery } from "urql"
import { MyProvidersDocument, type MyProvidersQuery } from "../gql"

/**
 * Providers connected by the current viewer. Used by the Providers app to
 * render the "connected" section, and by Files to populate the sidebar.
 */
export function useMyProviders() {
  const [result, refetch] = useQuery<MyProvidersQuery>({
    query: MyProvidersDocument,
    requestPolicy: "cache-and-network",
  })
  return {
    providers: result.data?.myProviders ?? [],
    fetching: result.fetching,
    error: result.error,
    refetch: () => refetch({ requestPolicy: "network-only" }),
  }
}
