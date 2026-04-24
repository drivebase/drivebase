import { useMutation } from "urql"
import {
  CancelOperationDocument,
  type CancelOperationMutation,
  type CancelOperationMutationVariables,
} from "../gql"

/**
 * Mark an operation cancelled. No-op if already in a terminal state.
 */
export function useCancelOperation() {
  return useMutation<
    CancelOperationMutation,
    CancelOperationMutationVariables
  >(CancelOperationDocument)
}
