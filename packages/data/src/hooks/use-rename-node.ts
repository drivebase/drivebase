import { useMutation } from "urql"
import {
  RenameNodeDocument,
  type RenameNodeMutation,
  type RenameNodeMutationVariables,
} from "../gql"

export function useRenameNode() {
  return useMutation<RenameNodeMutation, RenameNodeMutationVariables>(
    RenameNodeDocument,
  )
}
