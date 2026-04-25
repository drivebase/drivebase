import { useClient, useMutation } from "urql"
import {
  ConnectProviderDocument,
  MyProvidersDocument,
  type ConnectProviderMutation,
  type ConnectProviderMutationVariables,
} from "../gql"

export function useConnectProvider() {
  const client = useClient()
  const [state, execute] = useMutation<ConnectProviderMutation, ConnectProviderMutationVariables>(
    ConnectProviderDocument,
  )

  const connect = async (variables: ConnectProviderMutationVariables) => {
    const result = await execute(variables)
    if (result.data?.connectProvider) {
      client.query(MyProvidersDocument, {}, { requestPolicy: "network-only" }).toPromise()
    }
    return result
  }

  return [state, connect] as const
}
