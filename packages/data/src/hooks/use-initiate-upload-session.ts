import { useMutation } from "urql"
import {
  InitiateUploadSessionDocument,
  type InitiateUploadSessionMutation,
  type InitiateUploadSessionMutationVariables,
} from "../gql"

/**
 * Initiate byte transport for a `ready` upload operation. Proxy mode returns
 * `chunkUploadUrlPattern` (PUT each chunk to the URL with `{index}` replaced);
 * direct mode returns `presignedParts` (PUT each chunk to the matching URL,
 * collect ETags, and pass them to `completeUploadSession`).
 */
export function useInitiateUploadSession() {
  return useMutation<
    InitiateUploadSessionMutation,
    InitiateUploadSessionMutationVariables
  >(InitiateUploadSessionDocument)
}
