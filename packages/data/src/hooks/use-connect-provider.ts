import { useMutation } from "urql"
import {
  ConnectProviderDocument,
  type ConnectProviderMutation,
  type ConnectProviderMutationVariables,
} from "../gql"

/**
 * `connectProvider` mutation. Credentials are validated server-side by the
 * provider module, encrypted at rest, and the returned Provider row is what
 * the UI pushes into its connected list.
 */
export function useConnectProvider() {
  return useMutation<ConnectProviderMutation, ConnectProviderMutationVariables>(
    ConnectProviderDocument,
  )
}
