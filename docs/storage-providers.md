# Storage Providers

## Overview

Storage providers are plugins that connect Drivebase to external storage services. Each provider implements the `IStorageProvider` interface, enabling a unified API for file operations across different backends.

## Supported Providers

| Provider      | Upload | Download | Presigned URLs | Quota |
|---------------|--------|----------|----------------|-------|
| Google Drive  | ✓      | ✓        | ✓              | ✓     |
| S3            | ✓      | ✓        | ✓              | ✓*    |
| Local Storage | ✓      | ✓        |                | ✓**   |

*S3 quota depends on bucket configuration.
**Local Storage quota is based on filesystem available space.

## Provider Interface

All providers implement the `IStorageProvider` interface:

```typescript
interface IStorageProvider {
  id: string;
  name: string;
  type: ProviderType;
  capabilities: ProviderCapabilities;

  initialize(credentials: ProviderCredentials): Promise<void>;

  // File operations
  uploadFile(stream: ReadableStream, metadata: FileMetadata): Promise<string>;
  downloadFile(remoteId: string): Promise<ReadableStream>;
  deleteFile(remoteId: string): Promise<void>;

  // URL generation
  getUploadUrl(metadata: FileMetadata): Promise<PresignedUrl | null>;
  getDownloadUrl(remoteId: string): Promise<string | null>;

  // Quota
  getQuota(): Promise<QuotaInfo>;
}
```

## Connecting Providers

All providers are connected using the generic `connectStorage` mutation:

```graphql
mutation ConnectStorage($input: ConnectStorageInput!) {
  connectStorage(input: $input) {
    id
    name
    type
    quotaTotal
    quotaUsed
  }
}
```

This plugin-based architecture means adding new storage providers only requires implementing the `IStorageProvider` interface and registering the type.

## Google Drive

### Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Google Drive API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs

### Getting Credentials

For development, use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):

1. Click the gear icon, check "Use your own OAuth credentials"
2. Enter your Client ID and Client Secret
3. Select `https://www.googleapis.com/auth/drive` scope
4. Authorize and exchange for tokens
5. Copy the refresh token

### Configuration

```graphql
mutation {
  connectStorage(input: {
    name: "Personal Drive"
    type: GOOGLE_DRIVE
    config: {
      clientId: "xxx.apps.googleusercontent.com"
      clientSecret: "GOCSPX-xxx"
      refreshToken: "1//xxx"
    }
  }) {
    id
    quotaTotal
    quotaUsed
  }
}
```

### Capabilities

- **Presigned URLs**: Uses `webContentLink` for downloads
- **Quota**: Full quota tracking via Drive API
- **Folders**: Supports folder structure
- **Metadata**: Full file metadata support

### Limitations

- Rate limits: 10,000 queries per day per user (default)
- File size: 5TB maximum
- Upload: Resumable uploads for large files

## S3-Compatible Storage

Works with any S3-compatible service:
- AWS S3
- MinIO
- DigitalOcean Spaces
- Backblaze B2
- Cloudflare R2
- Wasabi

### Configuration

#### AWS S3

```graphql
mutation {
  connectStorage(input: {
    name: "AWS S3 Bucket"
    type: S3
    config: {
      accessKeyId: "AKIAIOSFODNN7EXAMPLE"
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      bucket: "my-bucket"
      region: "us-east-1"
    }
  }) {
    id
  }
}
```

#### MinIO

```graphql
mutation {
  connectStorage(input: {
    name: "MinIO Storage"
    type: S3
    config: {
      accessKeyId: "minioadmin"
      secretAccessKey: "minioadmin"
      bucket: "drivebase"
      region: "us-east-1"
      endpoint: "http://localhost:9000"
    }
  }) {
    id
  }
}
```

#### DigitalOcean Spaces

```graphql
mutation {
  connectStorage(input: {
    name: "DO Spaces"
    type: S3
    config: {
      accessKeyId: "your-access-key"
      secretAccessKey: "your-secret-key"
      bucket: "my-space"
      region: "nyc3"
      endpoint: "https://nyc3.digitaloceanspaces.com"
    }
  }) {
    id
  }
}
```

#### Backblaze B2

```graphql
mutation {
  connectStorage(input: {
    name: "Backblaze B2"
    type: S3
    config: {
      accessKeyId: "your-key-id"
      secretAccessKey: "your-application-key"
      bucket: "my-bucket"
      region: "us-west-002"
      endpoint: "https://s3.us-west-002.backblazeb2.com"
    }
  }) {
    id
  }
}
```

### Capabilities

- **Presigned URLs**: Full support for upload and download
- **Quota**: Via bucket size calculation (may require permissions)
- **Multipart Upload**: Automatic for large files
- **CORS**: Must be configured on bucket for direct uploads

### CORS Configuration

For direct browser uploads, configure CORS on your bucket:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

## Local Storage

Local Storage allows you to use any mounted filesystem path as a storage provider. This includes:

- Local directories on the host machine
- External drives and USB storage
- Network-attached storage (NAS) mounts
- Docker volumes (when running in a container)

### Configuration

```graphql
mutation {
  connectStorage(input: {
    name: "My External Drive"
    type: LOCAL_STORAGE
    config: {
      path: "/mnt/external-drive"
    }
  }) {
    id
    name
    quotaTotal
    quotaUsed
  }
}
```

### Use Cases

#### Local Directory

Use a directory on your local machine:

```graphql
mutation {
  connectStorage(input: {
    name: "Local Files"
    type: LOCAL_STORAGE
    config: {
      path: "/home/user/drivebase-storage"
    }
  }) {
    id
  }
}
```

#### External Drive

Mount an external drive and use it as storage:

```graphql
mutation {
  connectStorage(input: {
    name: "Backup Drive"
    type: LOCAL_STORAGE
    config: {
      path: "/mnt/usb-drive"
    }
  }) {
    id
  }
}
```

#### NAS Mount

Use network-attached storage:

```graphql
mutation {
  connectStorage(input: {
    name: "NAS Storage"
    type: LOCAL_STORAGE
    config: {
      path: "/mnt/nas/drivebase"
    }
  }) {
    id
  }
}
```

#### Docker Volume

When running Drivebase in a container, mount a volume and connect it:

```yaml
# compose.yaml
services:
  api:
    image: drivebase/api
    volumes:
      # Named volume
      - storage_data:/data/storage
      # Or bind mount to host
      - /path/on/host:/data/storage
      # Or external drive
      - /mnt/external-drive:/data/external
```

Then connect the mounted path in the app:

```graphql
mutation {
  connectStorage(input: {
    name: "Docker Volume Storage"
    type: LOCAL_STORAGE
    config: {
      path: "/data/storage"
    }
  }) {
    id
  }
}
```

### Capabilities

- **Upload/Download**: Direct filesystem read/write
- **Quota**: Based on filesystem available space (uses `statfs`)
- **Folders**: Full folder structure support
- **Permissions**: Respects filesystem permissions

### Considerations

- **Path Validation**: The path must exist and be writable by the application
- **Permissions**: Ensure the app has read/write access to the directory
- **Docker**: When running in a container, the path refers to the container's filesystem (use volume mounts)
- **Portability**: Paths are specific to the host/container - plan accordingly for backups and migrations

## Adding Custom Providers (Plugin System)

Drivebase uses a plugin-based architecture for storage providers. Adding a new provider is straightforward:

1. Create a new package in `packages/`:

```
packages/
└── my-provider/
    ├── package.json
    ├── tsconfig.json
    ├── index.ts         # Main export
    ├── provider.ts      # Provider implementation
    └── schema.ts        # Zod schema for config validation
```

2. Implement the `IStorageProvider` interface:

```typescript
import type {
  IStorageProvider,
  ProviderCapabilities,
  FileMetadata,
  QuotaInfo
} from '@drivebase/core';

export class MyProvider implements IStorageProvider {
  id: string;
  name: string;
  type = 'MY_PROVIDER' as const;

  capabilities: ProviderCapabilities = {
    presignedUpload: true,
    presignedDownload: true,
    folders: true,
    quota: true,
  };

  async initialize(config: MyProviderConfig): Promise<void> {
    // Initialize client with config
  }

  async uploadFile(stream: ReadableStream, metadata: FileMetadata): Promise<string> {
    // Upload and return remote ID
  }

  async downloadFile(remoteId: string): Promise<ReadableStream> {
    // Return file stream
  }

  // ... implement other methods
}
```

3. Define the config schema:

```typescript
// schema.ts
import { z } from 'zod';

export const myProviderConfigSchema = z.object({
  apiKey: z.string(),        // Will be encrypted automatically
  apiSecret: z.string(),     // Will be encrypted automatically
  region: z.string().optional(),
  // ... provider-specific fields
});

export type MyProviderConfig = z.infer<typeof myProviderConfigSchema>;

// Mark which fields should be encrypted (sensitive data)
export const myProviderSensitiveFields = ['apiKey', 'apiSecret'];
```

**Note**: The system automatically encrypts all config values before storage. Identify sensitive fields in your provider implementation for proper handling.

4. Register in the provider registry:

```typescript
// apps/api/config/providers.ts
import {
  MyProvider,
  myProviderConfigSchema,
  myProviderSensitiveFields
} from '@drivebase/my-provider';

export const providerRegistry = {
  GOOGLE_DRIVE: {
    provider: GoogleDriveProvider,
    schema: googleDriveConfigSchema,
    sensitiveFields: ['clientSecret', 'refreshToken']
  },
  S3: {
    provider: S3Provider,
    schema: s3ConfigSchema,
    sensitiveFields: ['accessKeyId', 'secretAccessKey']
  },
  LOCAL_STORAGE: {
    provider: LocalStorageProvider,
    schema: localStorageConfigSchema,
    sensitiveFields: [] // No sensitive fields for local storage
  },
  MY_PROVIDER: {
    provider: MyProvider,
    schema: myProviderConfigSchema,
    sensitiveFields: myProviderSensitiveFields
  },
};
```

5. Add the type to `ProviderType` enum in the GraphQL schema.

That's it! The generic `connectStorage` mutation will automatically work with your new provider:

```graphql
mutation {
  connectStorage(input: {
    name: "My Custom Storage"
    type: MY_PROVIDER
    config: {
      apiKey: "xxx"
      region: "us-east-1"
    }
  }) {
    id
  }
}
```

## Provider Lifecycle

```
┌─────────┐     ┌─────────────┐     ┌────────┐     ┌──────────┐
│ Connect │────▶│ Initialize  │────▶│ Active │────▶│ Disconnect│
└─────────┘     └─────────────┘     └────────┘     └──────────┘
                      │                   │
                      ▼                   ▼
                ┌─────────┐         ┌─────────┐
                │  Error  │         │  Sync   │
                └─────────┘         └─────────┘
```

1. **Connect**: User provides credentials via GraphQL mutation
2. **Initialize**: Provider validates credentials and fetches quota
3. **Active**: Provider is ready for file operations
4. **Sync**: Periodic refresh of quota and connection status
5. **Disconnect**: Remove provider and optionally delete files

## Best Practices

1. **Credentials Storage**:
   - All provider credentials are encrypted at rest using AES-256-GCM
   - Encryption key is stored in environment variable (`ENCRYPTION_KEY`)
   - Credentials are decrypted only when needed for provider operations
   - Never log or expose decrypted credentials

2. **Token Refresh**: OAuth tokens are refreshed automatically before expiry

3. **Error Handling**: Transient errors are retried with exponential backoff

4. **Quota Management**: Check quota before large uploads

5. **Connection Health**: Providers are periodically pinged to verify connectivity

## Environment Configuration

Required environment variables for the API:

```env
# Encryption key for provider credentials (minimum 32 characters)
ENCRYPTION_KEY=your-encryption-key-minimum-32-characters-long

# Database and other services
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
```

**Important**: Keep the `ENCRYPTION_KEY` secure and consistent across deployments. Changing this key will make existing provider credentials unreadable.
