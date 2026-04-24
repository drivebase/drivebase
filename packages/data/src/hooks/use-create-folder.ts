import { useMutation } from "urql"
import {
  CreateFolderDocument,
  type CreateFolderMutation,
  type CreateFolderMutationVariables,
} from "../gql"

export function useCreateFolder() {
  return useMutation<CreateFolderMutation, CreateFolderMutationVariables>(
    CreateFolderDocument,
  )
}
