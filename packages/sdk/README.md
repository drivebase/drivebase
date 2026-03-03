# @drivebase/sdk

TypeScript SDK for the Drivebase API.

`@drivebase/sdk` provides a typed client for common file and folder operations over Drivebase GraphQL + REST endpoints, including uploads, downloads, search, and metadata actions.

## Features

- Typed `DrivebaseClient` for browser and server usage
- File operations: list, get, contents, search, smart search, upload, download, rename, move, delete, star/unstar
- Folder operations: list, get, create, rename, move, delete, star/unstar
- Built-in upload strategies:
  - Simple upload for smaller files
  - Chunked upload for larger files
- Typed error classes for API, auth, network, and upload failures
- ESM + CJS builds with TypeScript declarations

## Installation

```bash
bun add @drivebase/sdk
```

Or with npm:

```bash
npm install @drivebase/sdk
```

## Quick Start

```ts
import { DrivebaseClient } from "@drivebase/sdk";

const client = new DrivebaseClient({
  apiKey: process.env.DRIVEBASE_API_KEY!,
  workspaceId: process.env.DRIVEBASE_WORKSPACE_ID!,
  baseUrl: "https://your-drivebase-instance.com",
});

const files = await client.files.list({ limit: 20 });
console.log(files.total, files.files);
```

## Configuration

`DrivebaseClient` options:

- `apiKey` (required): Drivebase API key (`Bearer` token)
- `workspaceId` (required): Workspace to operate in (sent as `x-workspace-id`)
- `baseUrl` (optional): Base URL of your Drivebase API (default: `http://localhost:4000`)
- `fetch` (optional): Custom `fetch` implementation

If `baseUrl` ends with `/graphql`, it is normalized automatically.

## API

### Files Resource

`client.files` methods:

- `get(id)`
- `list({ folderId?, limit?, offset? })`
- `contents({ folderId?, providerIds? })`
- `search(query, limit?)`
- `smartSearch(query, limit?)`
- `recent({ limit? })`
- `starred()`
- `upload(options, onProgress?)`
- `download(id)`
- `rename(id, name)`
- `move(id, folderId?)`
- `delete(id)`
- `star(id)`
- `unstar(id)`

### Folders Resource

`client.folders` methods:

- `get(id)`
- `list({ parentId?, providerIds? })`
- `starred()`
- `create({ name, providerId, parentId? })`
- `rename(id, name)`
- `move(id, parentId?)`
- `delete(id)`
- `star(id)`
- `unstar(id)`

## Uploads

Use `client.files.upload(...)` with progress reporting:

```ts
const file = await client.files.upload(
  {
    data: someBlobOrArrayBuffer,
    name: "report.pdf",
    mimeType: "application/pdf",
    size: someBlobOrArrayBuffer.byteLength ?? someBlobOrArrayBuffer.size,
    providerId: "provider_123",
    folderId: "folder_456", // optional
  },
  (progress) => {
    console.log(progress.phase, progress.percent);
  },
);
```

`progress.phase` values:

- `uploading`
- `transferring`
- `complete`

## Downloads

`client.files.download(id)` returns:

- `url`: direct provider URL when available, otherwise Drivebase proxy URL
- `stream()`: lazy function returning `ReadableStream<Uint8Array>`

Example:

```ts
const download = await client.files.download("file_123");
const stream = await download.stream();
```

## Error Handling

The SDK throws typed errors:

- `DrivebaseError` (base class)
- `ApiError` (GraphQL/API-level failures)
- `AuthenticationError` (401 / invalid credentials)
- `NetworkError` (connection/transport errors)
- `UploadError` (upload-specific failures)

Example:

```ts
import {
  ApiError,
  AuthenticationError,
  DrivebaseError,
  NetworkError,
  UploadError,
} from "@drivebase/sdk";

try {
  await client.files.list();
} catch (error) {
  if (error instanceof AuthenticationError) {
    // invalid apiKey or workspace access
  } else if (error instanceof ApiError) {
    console.error(error.errors);
  } else if (error instanceof UploadError) {
    console.error(error.sessionId);
  } else if (error instanceof NetworkError) {
    console.error(error.message);
  } else if (error instanceof DrivebaseError) {
    console.error(error.code, error.message);
  }
}
```

## Development

From the repository root:

```bash
bun run --filter @drivebase/sdk build
bun run --filter @drivebase/sdk check-types
```

SDK tests:

```bash
bun test packages/sdk/tests
```

## License

MIT
