# @drivebase/core

Core types, interfaces, and enums shared across the Drivebase monorepo. This package provides the foundation for the virtual filesystem abstraction and storage provider plugin architecture.

## Overview

The `@drivebase/core` package defines the shared contracts and types used throughout Drivebase:

- **Enums**: User roles, permission roles, provider types, and activity types
- **Types**: Data models for users, files, folders, permissions, providers, and activities
- **Interfaces**: The `IStorageProvider` interface that all storage provider plugins must implement

## Key Concepts

### Virtual Filesystem

Drivebase creates a unified view over multiple storage providers:

- **Virtual Path**: The path users see (e.g., `/Documents/report.pdf`)
- **Remote ID**: The provider-specific identifier for the file
- **Provider ID**: Which storage provider holds the actual file

### Storage Providers

Storage providers are plugins that implement the `IStorageProvider` interface:

```typescript
import type { IStorageProvider, ProviderConfig } from "@drivebase/core";

export class MyProvider implements IStorageProvider {
  async initialize(config: ProviderConfig): Promise<void> {
    // Initialize with decrypted config
  }

  async testConnection(): Promise<boolean> {
    // Test provider connection
  }

  async getQuota(): Promise<ProviderQuota> {
    // Return quota information
  }

  // ... implement other required methods
}
```

### Permission Model

Folder-level permissions with inheritance:

| Role    | View | Edit | Delete | Manage Permissions |
|---------|------|------|--------|---------------------|
| Viewer  | ✓    |      |        |                     |
| Editor  | ✓    | ✓    |        |                     |
| Admin   | ✓    | ✓    | ✓      | ✓                   |
| Owner   | ✓    | ✓    | ✓      | ✓                   |

### User Roles

System-wide user roles:

- **Owner**: Full system access, can manage all users and providers
- **Admin**: Can manage users and connect providers
- **Editor**: Can upload, edit, and organize files
- **Viewer**: Read-only access to shared files

## Usage

Import types and interfaces from the package:

```typescript
import {
  // Enums
  UserRole,
  PermissionRole,
  ProviderType,
  ActivityType,

  // Types
  User,
  File,
  Folder,
  Permission,
  StorageProvider,
  Activity,

  // Interfaces
  IStorageProvider,
  ProviderConfig,
  UploadOptions,
  DownloadOptions,
} from "@drivebase/core";
```

## Creating a Storage Provider

To create a new storage provider:

1. Implement the `IStorageProvider` interface
2. Define a Zod schema for your provider's configuration
3. Register it in the provider registry

Example:

```typescript
import { z } from "zod";
import type {
  IStorageProvider,
  ProviderRegistration
} from "@drivebase/core";

// 1. Implement the interface
export class MyStorageProvider implements IStorageProvider {
  // ... implementation
}

// 2. Define config schema
export const MyProviderConfigSchema = z.object({
  apiKey: z.string(),
  endpoint: z.string().url(),
  bucket: z.string(),
});

// 3. Create registration
export const myProviderRegistration: ProviderRegistration = {
  factory: () => new MyStorageProvider(),
  configSchema: MyProviderConfigSchema,
  description: "My custom storage provider",
  supportsPresignedUrls: true,
};
```

## File Operations

The `IStorageProvider` interface supports:

- **Upload/Download**: With optional presigned URL support
- **Folder Management**: Create, delete, move, copy
- **Listing**: Paginated file/folder listing
- **Metadata**: Retrieve file and folder metadata
- **Quota**: Track storage usage

### Presigned URLs

Providers can optionally support presigned URLs for direct client uploads/downloads:

- If `supportsPresignedUrls` is true, `requestUpload()` returns a presigned URL
- Client uploads directly to the provider using the presigned URL
- If false, client uploads through the API which proxies to the provider

## Development

This package is written in TypeScript and designed for use with Bun.

```bash
# Install dependencies
bun install

# Type check
bun run tsc --noEmit
```

## License

MIT
