---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- Use `ioredis` for Redis (Bun.redis has typing issues).
- Use `drizzle-orm/node-postgres` with `pg` driver for PostgreSQL.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Drivebase Project Conventions

### Type Safety

- NEVER use `any` type - always use proper TypeScript types
- NEVER use non-null assertions (`!`) - validate and throw errors instead
- Goal: Zero TypeScript errors (`bunx tsc --noEmit` should pass)
- Use GraphQLContext type for resolver helpers, not `any`
- Convert `null` to `undefined` for optional params: `value ?? undefined`
- When optional fields are required, validate and throw descriptive errors

### GraphQL Development

- Schema-first approach: write `.graphql` files in `apps/api/graphql/schema/`
- Run `bun run codegen` to generate TypeScript types
- Resolvers must use generated types from `graphql/generated/types.ts`
- Use GraphQL Yoga for the server

### Database Patterns

- Use Drizzle ORM with `drizzle-orm/node-postgres` and `pg` driver
- Soft deletes: set `isDeleted: true` instead of removing records
- Always check for undefined returns: `if (!result) throw new Error(...)`
- Use workspace packages: `@drivebase/db`, `@drivebase/core`

### Storage Provider System

- All providers implement `IStorageProvider` from `@drivebase/core`
- Register providers in `apps/api/config/providers.ts`
- Use virtual paths separate from provider-specific remote IDs
- Encrypt sensitive credentials with AES-256-GCM (see `utils/encryption.ts`)
- Always call `provider.cleanup()` after operations

### Error Handling

- Use custom errors from `@drivebase/core`: NotFoundError, ValidationError, etc.
- ProviderError requires provider type as first param: `ProviderError("google_drive", ...)`
- Throw errors early, don't return null/undefined for error cases

### Monorepo Structure

- `packages/core` - shared types, interfaces, utilities
- `packages/db` - Drizzle schema and database client
- `packages/google-drive` - Google Drive provider
- `packages/s3` - S3-compatible provider (AWS SDK v3)
- `packages/local` - local filesystem provider
- `apps/api` - GraphQL API server
- `apps/web` - React web app (TanStack Router, urql, Zustand)

### Web App Architecture (`apps/web/src/`)

The web app uses a **feature-based architecture**. All domain logic lives in self-contained feature directories. Route files are thin composition layers that wire hooks and components together.

```
apps/web/src/
├── features/           # Domain-specific modules (self-contained)
│   ├── files/          # File/folder management
│   │   ├── api/        # GraphQL queries & mutations (file.ts, folder.ts)
│   │   ├── hooks/      # useFiles, useFolders, useUpload, useFileDrop,
│   │   │               # useFileOperations, useDragAndDrop, useBreadcrumbs
│   │   ├── components/ # DroppableBreadcrumb, FilesToolbar, FileDropZone
│   │   └── index.ts    # Barrel export
│   ├── providers/      # Storage provider management
│   │   ├── api/        # provider.ts (queries, mutations, subscriptions)
│   │   ├── hooks/      # useProviders, useProviderConnect, useProviderSync,
│   │   │               # useProviderDisconnect, useProviderQuota
│   │   └── index.ts
│   ├── auth/           # Authentication
│   │   ├── api/        # auth.ts
│   │   ├── hooks/      # useAuth (useMe, useLogin, useRegister, useLogout)
│   │   ├── store/      # authStore (Zustand)
│   │   └── index.ts
│   ├── dashboard/      # Dashboard page
│   ├── settings/       # Settings page
│   ├── onboarding/     # Onboarding wizard
│   └── telegram/       # Telegram auth flow
├── shared/             # Cross-feature utilities
│   ├── hooks/          # useOptimisticList, useAppUpdate
│   ├── components/     # InfoPanel (base component)
│   ├── api/            # fragments, activity, metadata, permission, user
│   ├── store/          # rightPanelStore, filesStore
│   └── lib/            # urql client, confirmDialog, promptDialog, utils
├── components/         # UI layer (unchanged)
│   ├── layout/         # DashboardLayout, Header, Sidebar, RightPanel
│   └── ui/             # shadcn components
├── gql/                # GraphQL codegen output (do not edit)
├── routes/             # TanStack Router route files (thin composition)
└── config/             # Static configuration
```

#### Web App Rules

- **Feature isolation**: Domain logic (API calls, hooks, components) belongs in `features/<domain>/`. Never put business logic directly in route files.
- **Thin route files**: Route components should only compose hooks and render components. All state management, mutations, and side effects go in hooks.
- **Import paths**: Use `@/features/<domain>/...` for feature code, `@/shared/...` for cross-cutting concerns. The `@/` alias maps to `./src/`.
- **Optimistic updates**: Use `useOptimisticList` from `@/shared/hooks/useOptimisticList` for lists that need optimistic mutations with rollback.
- **New features**: Create a new directory under `features/` with `api/`, `hooks/`, `components/` subdirectories and an `index.ts` barrel export.
- **Shared code**: Only put code in `shared/` if it's used by 2+ features. Feature-specific code stays in the feature directory.
- **Barrel exports**: Each feature has an `index.ts` that re-exports its public API. Internal implementation details should not be exported.

## Current Product Standards (Must Follow)

### General Architecture

- Keep provider-specific logic modular inside each package (`packages/google-drive`, `packages/s3`, `packages/local`).
- Avoid hardcoded provider configuration values; always load from DB-stored encrypted config.
- Prefer extending existing shared components/hooks over creating route-specific variants.

### Providers & Storage

- Use `@aws-sdk/client-s3` for S3 provider integration.
- Always return upload/download contract via provider interface:
  - `requestUpload`, `uploadFile`
  - `requestDownload`, `downloadFile`
- For non-direct upload/download providers, always use API proxy endpoints.
- Always cleanup failed upload file records (DB) when upload transport fails.
- Google Drive auth:
  - rely on `refresh_token` for token refresh (do not depend on stale stored access token),
  - store connected account metadata (email/name) in DB for UI display.
- Local provider must support: upload, download, list, move, copy, delete, quota, metadata.

### GraphQL/API Practices

- Use schema-first development and run codegen after GraphQL schema or document updates:
  - `apps/api`: `bun run codegen`
  - `apps/web`: `bun run codegen`
- Add new app-level info queries under generic metadata naming:
  - use `appMetadata` (not one-off naming like `appVersion` query/file).
- For authenticated proxy routes (`/api/upload/proxy`, `/api/download/proxy`), ensure:
  - bearer token validation,
  - CORS/OPTIONS handling,
  - clear error messages.

### Database & Migrations

- Any DB schema change must include:
  - schema updates in `packages/db/schema/*`,
  - SQL migration in `packages/db/migrations/*`,
  - `_journal.json` entry update.
- Prefer safe backfill steps for new required fields (nullable add -> populate -> set not null).

### Files UI

- Use one unified file/folder table component everywhere.
- No route-specific action logic forks; behavior parity across Dashboard/Files/Favorites.
- “Details” action must open right panel file details view.
- “Download” must work for both direct URL and proxy URL flows.
- Favorites toggles must use optimistic UI updates (no full table refetch flicker).

### Data Table Standards

- File table is a unified Data Table (`@tanstack/react-table`) with:
  - row selection,
  - column visibility selection.
- Use shadcn checkbox component for selection controls.
- Keep selection and actions columns fixed-width.
- Keep actions menu trigger (three dots) right-aligned consistently.
- Avoid layout shift during loading:
  - keep top toolbar (selected count + columns button) visible in loading state.

### Search UX

- Header search must query DB-backed file search (`searchFiles`) with top 5 results.
- Selecting a result should navigate to the file’s parent folder path in `/files`.
- Use debounced input for query dispatch.

### Right Panel & Account UX

- Right panel content is configurable through Zustand store.
- When custom right-panel content is open, show a close button that restores default account view.
- Default account view should show:
  - avatar,
  - name,
  - email,
  - `My Account` button,
  - `Sign out` button,
  - Activity section with “No recent activity”.
- My Account page:
  - use clean settings-like layout (no card wrapper),
  - allow updating user `name`.

### Auth, Loading, and Error UX

- Never flash authenticated dashboard UI before auth bootstrap completes.
- Show full-screen branded loader (Drivebase logo) while loading current user.
- If API is unreachable during auth bootstrap, show full-screen retryable error state.
- Include root-level fallback error UI for unrecoverable route/render failures.

### Version Update UX

- On app load:
  - fetch current app version from API metadata query (`appMetadata.version`),
  - fetch latest GitHub release version,
  - compare against locally stored version,
  - show “Update available” indicator when versions differ.
- Persist local version and latest seen GitHub version in `localStorage`.
