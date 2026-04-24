import { useMutation } from "urql"
import {
  PreflightDocument,
  type PreflightMutation,
  type PreflightMutationVariables,
} from "../gql"

/**
 * Build an operation plan and run conflict detection. Returns the plan and
 * any conflicts; the caller decides whether to surface a conflict dialog,
 * call `decideConflicts`, or proceed straight to `executePlan`.
 */
export function usePreflight() {
  return useMutation<PreflightMutation, PreflightMutationVariables>(
    PreflightDocument,
  )
}
