import { useMutation } from "urql"
import {
  CompleteUploadSessionDocument,
  type CompleteUploadSessionMutation,
  type CompleteUploadSessionMutationVariables,
} from "../gql"

/**
 * Mark a session `ready` after all chunks/parts are in flight. Direct mode
 * requires `parts` (exactly `totalChunks` entries with the S3 ETags).
 */
export function useCompleteUploadSession() {
  return useMutation<
    CompleteUploadSessionMutation,
    CompleteUploadSessionMutationVariables
  >(CompleteUploadSessionDocument)
}
