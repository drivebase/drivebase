import { useQuery } from "urql"
import { ProviderTypesDocument, type ProviderTypesQuery } from "../gql"

/**
 * Reactive catalogue of provider types the server knows about. Drives the
 * Providers app connect picker and the dynamic credentials form.
 */
export function useProviderTypes() {
  const [result, refetch] = useQuery<ProviderTypesQuery>({
    query: ProviderTypesDocument,
    requestPolicy: "cache-and-network",
  })
  return {
    providerTypes: result.data?.providerTypes ?? [],
    fetching: result.fetching,
    error: result.error,
    refetch: () => refetch({ requestPolicy: "network-only" }),
  }
}
