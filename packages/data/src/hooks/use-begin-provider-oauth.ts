import { useMutation } from "urql"
import {
  BeginProviderOAuthDocument,
  type BeginProviderOAuthMutation,
  type BeginProviderOAuthMutationVariables,
} from "../gql"

/**
 * `beginProviderOAuth` mutation. Given a stored OAuth app id + label, the
 * server stashes state in Redis (10 min TTL) and returns the provider's
 * authorize URL. The client opens this in a popup and waits for the callback
 * page to `postMessage` the outcome.
 */
export function useBeginProviderOAuth() {
  return useMutation<
    BeginProviderOAuthMutation,
    BeginProviderOAuthMutationVariables
  >(BeginProviderOAuthDocument)
}
