# File Operations

## Overview

File operations split across two transport layers:
- **GraphQL** — browsing, metadata, folder management, file CRUD (rename, move, copy, delete)
- **REST** — upload (`POST /api/v1/upload`) and download (`GET /api/v1/download/{id}`, `GET /api/v1/templink/{id}`)

This split exists because GraphQL uses JSON-over-HTTP which is incompatible with binary streaming. Uploads and downloads need to stream bytes directly without buffering the entire file in memory.

## File Listing

`listFiles(input: ListFilesInput)` fetches the live directory listing from the storage provider and returns it enriched with database IDs.

**Flow:**

1. Check workspace read permission
2. If a `parentID` is provided, resolve it to a `remote_id` from the `FileNode` table
3. Check Redis file tree cache — if a valid cached listing exists, return it immediately
4. Call `provider.List()` with the parent remote ID and any pagination parameters
5. In a background goroutine, upsert all returned files into the `FileNode` table (create on first seen, update name/size/mime on subsequent calls)
6. Query the `FileNode` table for database UUIDs matching the returned remote IDs and inject them into the response
7. Store the listing in the Redis file tree cache for the configured TTL
8. Return the enriched listing

The DB UUID enrichment step (6) is important: storage providers return remote IDs, not database IDs. The database ID (`FileNode.id`) is what clients use to download, share, or reference files. Without this step, the listing would return zero UUIDs.

**Pagination:** The `ListOptions.PageToken` and `ListOptions.PageSize` are passed through to the provider. Not all providers support pagination — S3 uses continuation tokens, Google Drive uses page tokens, local filesystem returns everything at once.

## File Upload

`POST /api/v1/upload` — multipart form upload, requires a valid JWT.

**Parameters (form fields or query params):**
- `provider_id` — UUID of the target provider
- `parent_remote_id` — optional, remote ID of the destination folder (empty = root)

**File fields:**
- Use field name `file` or `files` — both are accepted

**Flow:**

1. Parse the multipart form (32 MB memory buffer, rest spills to disk)
2. Look up the provider and verify workspace write permission
3. Decrypt provider credentials and instantiate the storage backend
4. Create an `UploadBatch` record (tracks overall progress)
5. For each file in the form:
   - Open the multipart file reader
   - Call `provider.Upload()` — this streams the file body to the backend
   - Create a `FileNode` row with the returned remote ID
   - Create an `UploadBatchFile` row with status and size
6. Update the `UploadBatch` with final counts and status
7. Return a JSON response with batch ID and per-file results

On partial failure (some files succeed, some fail), the batch status reflects whether any files failed. The response always includes per-file error messages so the client knows which files to retry.

**Response shape:**
```json
{
  "batch_id": "uuid",
  "status": "completed",
  "total_files": 3,
  "completed_files": 2,
  "failed_files": 1,
  "transferred_bytes": 204800,
  "files": [
    { "name": "photo.jpg", "remote_id": "abc123" },
    { "name": "doc.pdf", "remote_id": "def456" },
    { "name": "video.mp4", "error": "upload failed: timeout" }
  ]
}
```

## File Download

`GET /api/v1/download/{fileNodeID}` — streams the file, requires either a valid JWT or a share token.

**Auth resolution order:**
1. Check if a valid authenticated user is in context (from the JWT middleware)
2. If yes, verify workspace read permission via RBAC
3. If no authenticated user, check if a validated share token is in context (from the sharing middleware)
4. If a share token exists, call `sharing.IsFileAccessible()` to verify the token covers this specific file
5. If neither check passes, return HTTP 401

**Flow after auth:**

1. Load `FileNode` record by ID from the database
2. Load the provider and decrypt credentials
3. Call `provider.Download(ctx, remoteID)` — returns an `io.ReadCloser` and `FileInfo`
4. Set `Content-Type` from `FileInfo.MimeType`
5. Set `Content-Disposition: attachment; filename="<name>"`
6. `io.Copy` from the provider's reader to the HTTP response writer
7. Close the reader

The provider's reader is a direct stream from the backend (e.g. an S3 GetObject response body). No intermediate buffering — the file data flows directly from the provider to the client.

## Temporary Link Download

`GET /api/v1/templink/{fileNodeID}?exp=<unix>&sig=<hex>` — no authentication required, signed URL only.

The signature is verified cryptographically before any DB lookup. If verification fails, the request is rejected immediately with HTTP 410 Gone. See [sharing.md](sharing.md) for how temp link signatures work.

After verification, the download proceeds identically to the authenticated download flow above.

## Folder Operations (GraphQL)

All folder and file metadata operations go through GraphQL resolvers:

| Mutation | Description |
|---|---|
| `createFolder(input)` | Creates a folder in the provider and saves a `FileNode` row |
| `renameFile(input)` | Renames via provider, updates the `FileNode` row |
| `moveFile(input)` | Moves via provider, updates `FileNode.parent_id` |
| `deleteFile(input)` | Deletes from provider, removes `FileNode` and children from DB |

Each of these operations:
1. Verifies workspace write permission
2. Calls the appropriate `provider.*` method
3. Updates the `FileNode` table to reflect the change
4. Invalidates the file tree cache for the affected folders

## FileNode Table

The `FileNode` table is a local mirror of the provider's file tree. It serves two purposes:

1. **Stable IDs**: Providers use their own ID schemes (S3 object keys, Google Drive file IDs, etc.). The `FileNode.id` UUID gives every file a stable, uniform identifier across all provider types.
2. **Fast lookups**: Resolving share tokens, generating download URLs, and checking file permissions all start with a `FileNode` lookup by UUID rather than a provider API call.

The table is kept in sync on every `listFiles` call (via the background upsert goroutine). It is not a complete cache of the provider's state — it only reflects files that have been listed or uploaded through Drivebase.
