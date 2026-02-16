import { graphql } from "@/gql";

export const INITIATE_CHUNKED_UPLOAD = graphql(`
  mutation InitiateChunkedUpload($input: InitiateChunkedUploadInput!) {
    initiateChunkedUpload(input: $input) {
      sessionId
      totalChunks
      chunkSize
      useDirectUpload
      presignedPartUrls {
        partNumber
        url
      }
    }
  }
`);

export const COMPLETE_S3_MULTIPART = graphql(`
  mutation CompleteS3MultipartUpload($sessionId: ID!, $parts: [S3PartInput!]!) {
    completeS3MultipartUpload(sessionId: $sessionId, parts: $parts)
  }
`);

export const CANCEL_UPLOAD_SESSION = graphql(`
  mutation CancelUploadSession($sessionId: ID!) {
    cancelUploadSession(sessionId: $sessionId)
  }
`);

export const RETRY_UPLOAD_SESSION = graphql(`
  mutation RetryUploadSession($sessionId: ID!) {
    retryUploadSession(sessionId: $sessionId)
  }
`);

export const ACTIVE_UPLOAD_SESSIONS = graphql(`
  query ActiveUploadSessions {
    activeUploadSessions {
      sessionId
      fileName
      totalSize
      status
      phase
      receivedChunks
      totalChunks
      providerBytesTransferred
      errorMessage
      createdAt
    }
  }
`);

export const UPLOAD_PROGRESS_SUBSCRIPTION = graphql(`
  subscription UploadProgress($sessionId: ID!) {
    uploadProgress(sessionId: $sessionId) {
      sessionId
      status
      phase
      receivedChunks
      totalChunks
      providerBytesTransferred
      totalSize
      errorMessage
    }
  }
`);
