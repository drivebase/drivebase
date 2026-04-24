import { useMutation } from "urql"
import {
  ResolveConflictDocument,
  type ResolveConflictMutation,
  type ResolveConflictMutationVariables,
} from "../gql"

export function useResolveConflict() {
  return useMutation<ResolveConflictMutation, ResolveConflictMutationVariables>(
    ResolveConflictDocument,
  )
}
