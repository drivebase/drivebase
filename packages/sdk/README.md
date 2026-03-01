# @drivebase/sdk

Official TypeScript/JavaScript SDK for [Drivebase](https://drivebase.io) - a cloud-agnostic file management platform.

## Features

- ✅ **Unified Storage API** - Simple methods for upload, download, list, and delete operations
- ✅ **Type Safety** - Full TypeScript support with comprehensive type definitions
- ✅ **Multi-Environment** - Works in Node.js, Browser, and Edge environments
- ✅ **Error Handling** - Comprehensive error classes for better debugging
- ✅ **Authentication** - Streamlined API key management

## Installation

```bash
npm install @drivebase/sdk
# or
yarn add @drivebase/sdk
# or
bun add @drivebase/sdk
```

## Quick Start

```typescript
import DrivebaseClient from '@drivebase/sdk';

// Initialize the client
const client = new DrivebaseClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.drivebase.io', // optional
});

// Upload a file
const file = new File(['Hello World'], 'hello.txt');
const result = await client.upload(file, {
  provider: 's3',
  path: '/documents',
});

console.log('Uploaded:', result.id);

// List files
const files = await client.list({
  provider: 's3',
  path: '/documents',
  limit: 10,
});

console.log('Files:', files.files);

// Download a file
const blob = await client.download(result.id);

// Delete a file
await client.delete(result.id);
```

## API Reference

### Constructor

```typescript
new DrivebaseClient(config?: DrivebaseConfig)
```

**Config Options:**
- `apiKey` (string): Your Drivebase API key (required)
- `baseUrl` (string): API base URL (default: 'https://api.drivebase.io')
- `timeout` (number): Request timeout in milliseconds (default: 30000)

### Methods

#### `upload(file, options?)`

Upload a file to Drivebase.

```typescript
await client.upload(file, {
  provider: 's3',
  path: '/folder',
  metadata: { key: 'value' },
  onProgress: (progress) => console.log(progress),
});
```

#### `download(fileId, options?)`

Download a file from Drivebase.

```typescript
const blob = await client.download('file-id', {
  provider: 's3',
});
```

#### `list(options?)`

List files in Drivebase.

```typescript
const result = await client.list({
  provider: 's3',
  path: '/folder',
  limit: 20,
  offset: 0,
});
```

#### `delete(fileId, options?)`

Delete a file from Drivebase.

```typescript
await client.delete('file-id', {
  provider: 's3',
  permanent: true,
});
```

#### `getMetadata(fileId)`

Get file metadata.

```typescript
const metadata = await client.getMetadata('file-id');
```

## Error Handling

The SDK provides specific error classes for different scenarios:

```typescript
import {
  DrivebaseError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  NetworkError,
} from '@drivebase/sdk';

try {
  await client.upload(file);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof NotFoundError) {
    console.error('File not found');
  } else if (error instanceof NetworkError) {
    console.error('Network error');
  }
}
```

## Environment Variables

You can set the API key via environment variable:

```bash
DRIVEBASE_API_KEY=your-api-key
```

Then initialize without config:

```typescript
const client = new DrivebaseClient();
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import type {
  FileMetadata,
  UploadOptions,
  UploadResult,
  ListResult,
} from '@drivebase/sdk';
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

## License

MIT © Drivebase Team
