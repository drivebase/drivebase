import { useQuery } from "urql"
import { MyOAuthAppsDocument, type MyOAuthAppsQuery } from "../gql"

export function useMyOAuthApps() {
  const [result, refetch] = useQuery<MyOAuthAppsQuery>({
    query: MyOAuthAppsDocument,
    requestPolicy: "cache-and-network",
  })

  return {
    oauthApps: result.data?.myOAuthApps ?? [],
    fetching: result.fetching,
    error: result.error,
    refetch: () => refetch({ requestPolicy: "network-only" }),
  }
}
