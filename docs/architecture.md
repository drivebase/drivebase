# Architecture

## Overview

Drivebase is a cloud-agnostic file management application that provides a unified virtual filesystem over multiple storage providers. Users can connect various cloud storage services (Google Drive, S3, etc.) and manage all their files through a single interface.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GraphQL API                               │
│                      (graphql-yoga)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │   Files      │  │   Storage Providers  │  │
│  │   Module     │  │   Module     │  │   Module             │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        Services Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │   File       │  │   Provider           │  │
│  │   Service    │  │   Service    │  │   Service            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                                │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │   PostgreSQL         │    │   Redis                      │  │
│  │   (Drizzle ORM)      │    │   (Sessions, Cache, Rate)    │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     Storage Providers                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Google     │  │   S3         │  │   Local Storage      │  │
│  │   Drive      │  │   Compatible │  │   (Docker Volumes)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
drivebase/
├── apps/
│   └── api/                    # GraphQL API server
│       ├── config/             # Environment, provider registry
│       ├── db/                 # Drizzle schema + migrations
│       ├── redis/              # Session, cache, rate limiting
│       ├── graphql/            # Schema, resolvers, context
│       ├── services/           # Business logic
│       ├── utils/              # JWT, password, OTP utilities
│       └── index.ts            # Entry point
│
├── packages/
│   ├── core/                   # Shared types and interfaces
│   ├── google-drive/           # Google Drive provider
│   ├── s3/                     # S3-compatible provider
│   └── local/                  # Local filesystem provider
│
└── docs/                       # Documentation
```

## Core Concepts

### Virtual Filesystem

Drivebase creates a virtual filesystem layer that abstracts away the underlying storage providers. Users interact with a unified file/folder structure, while the system handles mapping to actual provider-specific locations.

- **Virtual Path**: The path users see (e.g., `/Documents/report.pdf`)
- **Remote ID**: The provider-specific identifier for the file
- **Provider ID**: Which storage provider holds the actual file

### Storage Providers

Storage providers are plugins that implement the `IStorageProvider` interface. The system uses a generic `connectStorage` mutation that works with any registered provider type.

**Built-in Providers**:
- **Google Drive**: Cloud storage with OAuth authentication
- **S3**: Any S3-compatible storage (AWS, MinIO, DigitalOcean Spaces, etc.)
- **Local Storage**: Filesystem paths (local directories, external drives, NAS, Docker volumes)

**Provider Responsibilities**:
- File upload/download operations
- Quota management
- Presigned URL generation (when supported)
- Provider-specific authentication/configuration

**Plugin Architecture**:
Adding a new provider requires only:
1. Implementing the `IStorageProvider` interface
2. Defining a Zod config schema
3. Registering in the provider registry

### Permissions Model

Folder-level permissions with inheritance:

| Role    | View | Edit | Delete | Manage Permissions |
|---------|------|------|--------|--------------------|
| Viewer  | ✓    |      |        |                    |
| Editor  | ✓    | ✓    |        |                    |
| Admin   | ✓    | ✓    | ✓      | ✓                  |
| Owner   | ✓    | ✓    | ✓      | ✓                  |

### User Roles

- **Owner**: Full system access, can manage all users and providers
- **Admin**: Can manage users and connect providers
- **Editor**: Can upload, edit, and organize files
- **Viewer**: Read-only access to shared files

## Data Flow

### File Upload

```
1. Client requests upload URL
2. API checks permissions
3. If provider supports presigned URLs:
   - Generate presigned URL
   - Client uploads directly to provider
4. Else:
   - Client uploads to API
   - API proxies to provider
5. Create file record in database
6. Log activity
```

### File Download

```
1. Client requests file
2. API checks permissions
3. If provider supports presigned URLs:
   - Return presigned download URL
4. Else:
   - Stream file through API
5. Log activity
```

## Technology Stack

| Component      | Technology                    |
|----------------|-------------------------------|
| Runtime        | Bun                           |
| API            | GraphQL (graphql-yoga)        |
| Database       | PostgreSQL + Drizzle ORM      |
| Cache/Sessions | Redis (Bun.redis)             |
| Auth           | JWT (jose) + bcryptjs         |
| Validation     | Zod                           |
| Encryption     | AES-256-GCM (for credentials) |

## Security

- **Authentication**: JWT tokens stored in HTTP-only cookies
- **Password Hashing**: bcryptjs with salt rounds
- **Credential Encryption**: Storage provider credentials encrypted at rest using AES-256-GCM
  - Encryption key stored in environment variable (`ENCRYPTION_KEY`)
  - All sensitive provider config (API keys, secrets, tokens) encrypted before database storage
- **Rate Limiting**: Applied on authentication and sensitive endpoints
- **Session Management**: Session invalidation stored in Redis
- **Audit Trails**: Activity logging for all file operations
