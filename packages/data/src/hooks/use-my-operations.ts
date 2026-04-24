import { useCallback } from "react"
import { useQuery } from "urql"
import { MyOperationsDocument, type MyOperationsQuery } from "../gql"

export type OperationEntry = MyOperationsQuery["myOperations"][number]

export function useMyOperations() {
  const [result, reexecute] = useQuery({
    query: MyOperationsDocument,
    requestPolicy: "cache-first",
  })

  const refetch = useCallback(() => {
    reexecute({ requestPolicy: "network-only" })
  }, [reexecute])

  return {
    operations: result.data?.myOperations ?? [],
    fetching: result.fetching,
    error: result.error,
    refetch,
  }
}
