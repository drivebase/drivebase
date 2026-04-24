import { useCallback } from "react"
import { useQuery } from "urql"
import {
  ListChildrenDocument,
  type ListChildrenQuery,
  type ListChildrenQueryVariables,
} from "../gql"

/**
 * List children of a node on a provider. Pauses until `providerId` is set so
 * the Files app can mount the sidebar before a location is chosen. Pass
 * `parentId: null` for the provider root.
 */
export function useListChildren(variables: ListChildrenQueryVariables | null) {
  const [result, reexecute] = useQuery<
    ListChildrenQuery,
    ListChildrenQueryVariables
  >({
    query: ListChildrenDocument,
    variables: variables ?? ({} as ListChildrenQueryVariables),
    pause: !variables?.providerId,
    requestPolicy: "cache-and-network",
  })

  const refetch = useCallback(
    () => reexecute({ requestPolicy: "network-only" }),
    [reexecute],
  )

  return {
    nodes: result.data?.listChildren.nodes ?? [],
    nextPageToken: result.data?.listChildren.nextPageToken ?? null,
    fetching: result.fetching,
    error: result.error,
    refetch,
  }
}
