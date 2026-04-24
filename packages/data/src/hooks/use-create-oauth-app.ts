import { useMutation } from "urql"
import {
  CreateOAuthAppDocument,
  type CreateOAuthAppMutation,
  type CreateOAuthAppMutationVariables,
} from "../gql"

/**
 * `createOAuthApp` mutation. Stores the viewer's OAuth client id/secret for a
 * provider so it can be referenced by `beginProviderOAuth` when starting the
 * consent flow. Secret is encrypted at rest server-side.
 */
export function useCreateOAuthApp() {
  return useMutation<CreateOAuthAppMutation, CreateOAuthAppMutationVariables>(
    CreateOAuthAppDocument,
  )
}
