# Chunked File Upload System

## Overview

Files larger than 50MB are uploaded using a chunked upload system with background processing. Files under 50MB continue using the existing single-request proxy upload path.

## Architecture

```
Browser                    API Server                  Storage Provider
  |                           |                              |
  |-- initiateChunkedUpload ->|                              |
  |<- sessionId, totalChunks -|                              |
  |                           |                              |
  |-- POST /api/upload/chunk -|  (chunk 0)                   |
  |-- POST /api/upload/chunk -|  (chunk 1)                   |
  |-- POST /api/upload/chunk -|  (chunk N - final)           |
  |                           |-- assemble chunks            |
  |                           |-- enqueue BullMQ job ------->|
  |                           |                              |
  |<--- SSE progress events --|-- worker uploads to provider |
  |                           |-- mark session completed     |
```

## Flow

### Small Files (< 50MB)

Unchanged from before. Client calls `requestUpload` mutation, gets a proxy URL, POSTs the file in a single request.

### Large Files (>= 50MB) — Proxy Providers (Local, Google Drive)

1. Client calls `initiateChunkedUpload` mutation
2. Server creates a file record and an upload session (DB + Redis)
3. Client slices the file into 50MB chunks
4. Each chunk is POSTed to `POST /api/upload/chunk?sessionId=X&chunkIndex=Y`
5. Server writes each chunk to `/tmp/drivebase-uploads/{sessionId}/chunk-{index}`
6. On receiving the final chunk, server assembles all chunks into one file
7. Server enqueues a BullMQ job (`upload-to-provider`)
8. BullMQ worker streams the assembled file to the storage provider
9. Progress is published via GraphQL subscription (SSE)
10. Session is marked completed

### Large Files (>= 50MB) — S3 Direct Multipart

1. Client calls `initiateChunkedUpload` mutation
2. Server initiates S3 `CreateMultipartUpload` and generates presigned part URLs
3. Client PUTs each chunk directly to S3 using presigned URLs (no server proxy)
4. Client collects ETags from each part response
5. Client calls `completeS3MultipartUpload` mutation with all ETags
6. Server calls S3 `CompleteMultipartUpload`
7. Session is marked completed

## Key Components

### Database

- **`upload_sessions`** — Tracks session state, linked to file/provider/user
- **`upload_chunks`** — Records received chunks with unique constraint on `(session_id, chunk_index)` for idempotency

Schema: `packages/db/schema/upload-sessions.ts`
Migration: `packages/db/migrations/0001_chunked_uploads.sql`

### Server

| File | Purpose |
|------|---------|
| `apps/api/services/file/upload-session.ts` | Session manager (create, receive chunk, assemble, cancel, retry) |
| `apps/api/server/routes/upload-chunk.ts` | REST endpoint for receiving chunks |
| `apps/api/queue/upload-queue.ts` | BullMQ queue definition |
| `apps/api/queue/upload-worker.ts` | BullMQ worker that uploads assembled files to providers |
| `apps/api/graphql/schema/file.graphql` | GraphQL types and operations |
| `apps/api/graphql/resolvers/file.ts` | Resolver implementations |
| `apps/api/graphql/pubsub.ts` | PubSub channel for progress events |

### Client

| File | Purpose |
|------|---------|
| `apps/web/src/features/files/hooks/useChunkedUpload.ts` | Chunk splitting, S3 direct and proxy upload logic |
| `apps/web/src/features/files/hooks/useUpload.ts` | Routes files to chunked or small-file path based on size |
| `apps/web/src/features/files/hooks/useUploadSessionRestore.ts` | Restores active sessions on page reload |
| `apps/web/src/features/files/api/upload-session.ts` | GraphQL documents for chunked upload operations |
| `apps/web/src/features/files/UploadProgressPanel.tsx` | UI with phase labels, cancel, and retry buttons |

### Provider Interface

Optional multipart methods on `IStorageProvider` (`packages/core/interfaces.ts`):

- `supportsChunkedUpload` — boolean flag
- `initiateMultipartUpload()` — start a multipart session
- `uploadPart()` — upload a single part
- `completeMultipartUpload()` — finalize the upload
- `abortMultipartUpload()` — cancel the upload

Implemented by: `packages/s3/provider.ts`, `packages/google-drive/provider.ts`

## Retry and Error Handling

- **Chunk-level retry**: Each chunk upload retries up to 3 times with exponential backoff (1s, 2s, 4s)
- **BullMQ retry**: Server-to-provider transfer retries up to 3 times with exponential backoff (5s initial)
- **Manual retry**: Failed sessions can be retried via `retryUploadSession` mutation (re-enqueues BullMQ job without re-uploading chunks)
- **Cancel**: Active sessions can be cancelled via `cancelUploadSession` mutation

## Configuration

| Setting | Value | Location |
|---------|-------|----------|
| Chunk threshold | 50MB | `apps/web/src/features/files/hooks/useUpload.ts` |
| Chunk size | 50MB | `apps/web/src/features/files/hooks/useChunkedUpload.ts` |
| BullMQ concurrency | 3 | `apps/api/queue/upload-worker.ts` |
| Session expiry | 24 hours | `apps/api/services/file/upload-session.ts` |
| Presigned URL expiry | 1 hour | `packages/s3/provider.ts` |
| Temp file location | `/tmp/drivebase-uploads/` | `apps/api/services/file/upload-session.ts` |

## Known Limitations

- **No resume after browser close**: If the browser closes mid-upload, the upload must restart from scratch. Completed chunks on the server are preserved for the session expiry period but the client has no mechanism to resume yet.
- **S3 resume**: Presigned URLs expire after 1 hour. No `ListParts` call to discover already-uploaded parts on page reload.
- **Single-process PubSub**: Progress events use in-process PubSub, not Redis PubSub. Subscriptions only work within a single API process.
- **macOS .app bundles**: Browser reports incorrect file size for `.app` directory bundles, causing them to route through the small-file path.
