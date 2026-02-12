# @drivebase/db

Database schema and client for Drivebase using Drizzle ORM and PostgreSQL.

## Overview

This package provides:
- Database schema definitions using Drizzle ORM
- Database client with connection pooling
- Migration utilities
- Type-safe database operations

## Schema

The database schema includes the following tables:

### Users
- `id`: Unique identifier
- `email`: User email (unique)
- `passwordHash`: Hashed password
- `role`: User role (viewer, editor, admin, owner)
- `isActive`: Account status
- `lastLoginAt`: Last login timestamp
- `createdAt`, `updatedAt`: Timestamps

### Storage Providers
- `id`: Unique identifier
- `name`: Display name
- `type`: Provider type (google_drive, s3, local)
- `encryptedConfig`: Encrypted provider configuration
- `userId`: Owner user ID
- `isActive`: Provider status
- `quotaTotal`, `quotaUsed`: Storage quota in bytes
- `lastSyncAt`: Last quota sync timestamp
- `createdAt`, `updatedAt`: Timestamps

### Folders
- `id`: Unique identifier
- `virtualPath`: Virtual path in unified filesystem (unique)
- `name`: Folder name
- `remoteId`: Provider-specific folder ID
- `providerId`: Storage provider ID
- `parentId`: Parent folder ID (self-reference)
- `createdBy`: User who created the folder
- `isDeleted`: Soft delete flag
- `createdAt`, `updatedAt`: Timestamps

### Files
- `id`: Unique identifier
- `virtualPath`: Virtual path in unified filesystem (unique)
- `name`: File name
- `mimeType`: MIME type
- `size`: File size in bytes
- `hash`: MD5 hash for deduplication
- `remoteId`: Provider-specific file ID
- `providerId`: Storage provider ID
- `folderId`: Parent folder ID
- `uploadedBy`: User who uploaded the file
- `isDeleted`: Soft delete flag
- `createdAt`, `updatedAt`: Timestamps

### Permissions
- `id`: Unique identifier
- `folderId`: Folder ID
- `userId`: User ID
- `role`: Permission role (viewer, editor, admin, owner)
- `grantedBy`: User who granted the permission
- `createdAt`, `updatedAt`: Timestamps
- **Unique constraint**: One permission per user per folder

### Activities
- `id`: Unique identifier
- `type`: Activity type (upload, download, create, update, delete, move, copy, share, unshare)
- `userId`: User who performed the activity
- `fileId`: Related file ID (optional)
- `folderId`: Related folder ID (optional)
- `providerId`: Related provider ID (optional)
- `metadata`: Additional JSON metadata
- `ipAddress`: IP address of the user
- `userAgent`: User agent string
- `createdAt`: Timestamp

## Usage

### Database Client

```typescript
import { getDb } from "@drivebase/db";

const db = getDb();

// Query users
const users = await db.query.users.findMany();

// Insert a user
await db.insert(schema.users).values({
  email: "user@example.com",
  passwordHash: "...",
  role: "viewer",
});
```

### Schema Imports

```typescript
import {
  users,
  files,
  folders,
  permissions,
  storageProviders,
  activities,
  type User,
  type File,
  type Folder,
} from "@drivebase/db";
```

### Migrations

Generate migrations after schema changes:

```bash
bun run generate
```

Run migrations:

```bash
bun run migrate
```

Open Drizzle Studio (database GUI):

```bash
bun run studio
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
  - Example: `postgres://user:password@localhost:5432/drivebase`

## Development

The package uses Drizzle ORM with PostgreSQL (via `pg` / node-postgres driver) for type-safe database operations.

### Connection Pooling

The database client uses connection pooling:
- Max connections: 10
- Idle timeout: 20 seconds
- Connect timeout: 10 seconds

### ID Generation

Uses `nanoid` with a custom alphabet for generating unique IDs:
- 21 characters long
- URL-safe characters only
- No lookalike characters

## Type Safety

All table operations are fully typed:

```typescript
import { getDb, users, type User, type NewUser } from "@drivebase/db";

const db = getDb();

// Typed insert
const newUser: NewUser = {
  email: "user@example.com",
  passwordHash: "...",
  role: "viewer",
};

await db.insert(users).values(newUser);

// Typed query
const allUsers: User[] = await db.query.users.findMany();
```

## Relations

Tables are connected with foreign keys and cascading deletes:

- **Users** → Files, Folders, Permissions, Activities, Storage Providers
- **Storage Providers** → Files, Folders
- **Folders** → Files, Permissions (self-referencing for parent/child)
- **Files**, **Folders**, **Providers** → Activities

## License

MIT
