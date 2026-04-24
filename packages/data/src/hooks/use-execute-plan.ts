import { useMutation } from "urql"
import {
  ExecutePlanDocument,
  type ExecutePlanMutation,
  type ExecutePlanMutationVariables,
} from "../gql"

/**
 * Flip a `ready` operation to `running` and enqueue one job per entry.
 * Subscribe to `operationProgress(operationId)` to observe the run.
 */
export function useExecutePlan() {
  return useMutation<ExecutePlanMutation, ExecutePlanMutationVariables>(
    ExecutePlanDocument,
  )
}
