# Drivebase AI Agent Instructions

## Overview

Drivebase is a cloud-agnostic file management system built as a Bun monorepo. Users can connect multiple storage providers (S3, Google Drive, Dropbox, FTP, WebDAV, Telegram, Local) and manage files through a unified virtual folder structure.

**Core Stack**: Bun, TypeScript, GraphQL Yoga, Drizzle ORM (PostgreSQL), React (TanStack Router, urql, Zustand), BullMQ (Redis)

## Architecture

### Monorepo Structure

```
packages/
  core/          - Shared types, IStorageProvider interface, custom errors
  db/            - Drizzle schema, migrations, database client
  {provider}/    - Storage provider implementations (google-drive, s3, local, etc.)
apps/
  api/           - GraphQL server (Bun.serve), provider routes, upload worker
  web/           - React SPA with feature-based architecture
```

### Storage Provider System

**Key Concept**: All providers implement `IStorageProvider` from `@drivebase/core`. Files have both a virtual path (user-facing) and provider-specific `remoteId`.

- **Registration**: Each provider exports a `ProviderRegistration` object registered in `apps/api/config/providers.ts`
- **Credentials**: Encrypted with AES-256-GCM (see `apps/api/utils/encryption.ts`) before storing in DB
- **Instance Lifecycle**: Always call `provider.cleanup()` after operations to release resources
- **Upload/Download Flow**: Providers return presigned URLs when supported, otherwise proxy through API endpoints (`/api/upload/proxy`, `/api/download/proxy`)

Example provider structure:
```typescript
// packages/{provider}/
├── index.ts        // Exports registration and provider class
├── provider.ts     // Implements IStorageProvider
├── schema.ts       // Zod schema for config validation
└── oauth.ts        // OAuth helpers (if needed)
```

### GraphQL Development

**Schema-first workflow**:
1. Edit `.graphql` files in `apps/api/graphql/schema/`
2. Run `bun run codegen` in both `apps/api` and `apps/web`
3. Use generated types from `graphql/generated/types.ts`

- Context type: `GraphQLContext` has `db`, `user` (authenticated JWT payload or null), `headers`, `ip`
- Authentication: Check `context.user`, throw `NotFoundError("User not found")` if required
- Resolvers: Must match generated type signatures exactly

### Database Patterns

**Drizzle ORM with PostgreSQL**:
- Schema: `packages/db/schema/*.ts` (users, providers, files, folders, etc.)
- Soft deletes: Set `isDeleted: true` instead of deleting records
- Migrations: Generate with `bun run db:generate`, apply with `bun run db:migrate`
- Always check for undefined: `if (!result) throw new NotFoundError("...")`

**Migration workflow for schema changes**:
1. Update `packages/db/schema/*.ts`
2. Run `bun run db:generate` to create SQL migration
3. Verify migration in `packages/db/migrations/`
4. For new required fields: nullable → populate → alter to not null

### Upload Flow (Important!)

**Two-phase upload for proxy providers**:
1. **Client → API**: Chunked multipart upload to `/api/upload/proxy/:sessionId` (Bearer auth)
2. **API → Provider**: BullMQ worker (`apps/api/queue/upload-worker.ts`) transfers assembled file to provider

- Session tracking via `upload_sessions` table with upload/transfer status
- Progress events published via GraphQL subscriptions (GraphQL Yoga SSE)
- Cleanup failed records if provider transfer fails

Direct upload flow (S3): Client gets presigned URL from `requestUpload`, uploads directly to provider.

## Development Workflows

### Essential Commands

```bash
# Install dependencies (uses Bun)
bun install

# Development (runs both API and web)
bun run dev

# Type checking (CI requirement: zero errors)
bunx tsc --noEmit

# Database operations
bun run db:generate    # Generate migration after schema change
bun run db:migrate     # Apply pending migrations
bun run db:studio      # Open Drizzle Studio

# GraphQL codegen (after schema changes)
cd apps/api && bun run codegen
cd apps/web && bun run codegen

# Format/lint
bun run format
bun run check
```

### Environment Setup

Copy `.env.example` to `.env.local` and set:
- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`, `ENCRYPTION_KEY` (32+ chars)
- `API_BASE_URL`, `CORS_ORIGIN`
- Provider-specific OAuth credentials (e.g., `GOOGLE_CLIENT_ID`)

### Creating a New Storage Provider

See `.claude/skills/create-provider/SKILL.md` for full guide. Key steps:
1. Create `packages/{provider}/` with `provider.ts` implementing `IStorageProvider`
2. Define `schema.ts` (Zod) and export `{Provider}SensitiveFields`
3. Export `{provider}Registration` in `index.ts`
4. Register in `apps/api/config/providers.ts`
5. Add GraphQL schema if custom auth flow needed

## Web App Architecture (apps/web/src/)

**Feature-based structure**: Domain logic lives in `features/`, routes compose hooks/components.

```
features/
  {domain}/
    api/         - GraphQL queries/mutations
    hooks/       - Business logic hooks (useFiles, useProviders, etc.)
    components/  - Feature-specific components
    store/       - Zustand stores (if needed)
    index.ts     - Barrel export
```

**Critical rules**:
- **Thin routes**: Only compose hooks and render. No business logic in route files.
- **Import paths**: `@/features/{domain}`, `@/shared/...` (alias maps to `./src/`)
- **Optimistic updates**: Use `@/shared/hooks/useOptimisticList` for lists with mutations
- **Shared code**: Only if used by 2+ features, else keep in feature directory
- **File size limit**: Keep files under 300 lines of code - split larger files into smaller modules

### UI & Styling Consistency

**Always maintain consistent styling patterns**:
- Use shadcn/ui components from `components/ui/` (never create custom base UI components)
- Tailwind CSS v4 via `@tailwindcss/vite` for all styling
- Use `cn()` utility from `@/shared/lib/utils` for conditional className merging:
  ```typescript
  import { cn } from "@/shared/lib/utils";
  <div className={cn("base-classes", condition && "conditional-classes")} />
  ```
- Follow existing component patterns in `components/ui/` for variants and sizes
- Use CVA (class-variance-authority) for component variants, matching existing button/input patterns
- Layout components go in `components/layout/`, reusable UI primitives in `components/ui/`
- Never inline custom styles - use Tailwind utility classes only

Example structure:
```typescript
// features/files/hooks/useFileOperations.ts
export function useFileOperations() {
  const [, deleteFile] = useMutation(DELETE_FILE_MUTATION);
  const [, starFile] = useMutation(STAR_FILE_MUTATION);
  // ... return operations
}

// routes/files/$path.tsx
function FilesRoute() {
  const [contents] = useContents(path);
  const ops = useFileOperations();
  return <FilesTable data={contents.data} operations={ops} />;
}
```

### File & Folder Organization

**Structured approach** - follow existing patterns:
- Group related files by domain/feature, not by file type
- API calls in `api/`, hooks in `hooks/`, components in `components/`
- One export per file for components and hooks (named export matching filename)
- Barrel exports (`index.ts`) for public feature APIs
- Split large files (>300 LoC) into focused modules:
  - Extract sub-components into separate files
  - Split complex hooks into smaller composable hooks
  - Move utility functions to dedicated util files

## Project-Specific Conventions

### Type Safety (Non-negotiable)

- **Never** use `any` - always use proper types
- **Never** use non-null assertions (`!`) - validate and throw errors
- Convert `null` to `undefined` for optional params: `value ?? undefined`
- Goal: `bunx tsc --noEmit` passes with zero errors

### Error Handling

Use custom errors from `@drivebase/core`:
```typescript
import { NotFoundError, ValidationError, ProviderError } from "@drivebase/core";

// Standard errors
throw new NotFoundError("File not found");
throw new ValidationError("Invalid file name");

// Provider errors (note: provider type is first param)
throw new ProviderError("google_drive", "Upload failed", { details });
```

### Data Table Patterns

Files UI uses `@tanstack/react-table` with:
- Row selection (checkbox column, fixed width)
- Column visibility toggle
- Actions menu (three-dot menu, right-aligned)
- Avoid layout shift: Keep toolbar visible during loading states

### Authentication & Session

- JWT stored in `localStorage` (web) or Redis session (API)
- Bearer token in `Authorization: Bearer {token}` header
- Cookie fallback for SSE subscriptions
- Auth bootstrap: Never show dashboard UI before `useMe` query resolves

### Bun-Specific Patterns

```typescript
// File I/O
const file = Bun.file("path/to/file");
await Bun.write("output.txt", data);

// Process spawning (prefer over execa)
await Bun.$`ls -la`;

// Built-in WebSocket (no 'ws' package)
// Built-in .env loading (no dotenv)
```

## Common Pitfalls

1. **Forgetting codegen**: GraphQL schema changes require running `bun run codegen` in both API and web
2. **Direct file mutations**: Use mutations with optimistic updates, not manual cache updates
3. **Provider cleanup**: Always call `provider.cleanup()` in finally blocks
4. **Schema migrations**: Update `_journal.json` when adding migrations manually
5. **Route business logic**: Keep routes thin - move logic to hooks in `features/`
6. **Session cleanup**: Failed uploads must cleanup DB records and temp files
7. **File size**: Split files exceeding 300 LoC into focused modules
8. **UI inconsistency**: Always use existing shadcn/ui components, never create custom base components

## Testing Strategy

- Use `bun test` (built-in test runner, Jest-compatible API)
- Test files: `*.test.ts` adjacent to source files
- Provider tests: Mock provider SDK, test IStorageProvider contract compliance
- Integration tests: Real DB/Redis via Docker Compose

## Key Files to Reference

- Storage interface: `packages/core/interfaces.ts`
- Provider registry: `apps/api/config/providers.ts`
- GraphQL context: `apps/api/graphql/context.ts`
- Upload worker: `apps/api/queue/upload-worker.ts`
- Web hooks pattern: `apps/web/src/features/files/hooks/useFiles.ts`
- Encryption utils: `apps/api/utils/encryption.ts`
