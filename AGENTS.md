# AGENTS.md

## Scope
Drivebase is a Bun monorepo for cloud-agnostic file management.
- API: `apps/api` (GraphQL Yoga, services, workers)
- Web: `apps/web` (TanStack Router, urql, Zustand)
- Shared: `packages/*` (`core`, `db`, providers, utils)

## Canonical Rules
`AGENTS.md` is the canonical engineering rulebook for this repository.

## Architecture Snapshot
- Schema-first GraphQL in `apps/api/graphql/schema/*`
- Business logic in `apps/api/service/**` (split by `query/`, `mutation/`, `shared/`)
- Thin routes in web; domain logic in `apps/web/src/features/**`
- Storage providers implement `IStorageProvider` and are registered in `apps/api/config/providers.ts`

## Non-Negotiables
- Never hand-write DB migration SQL; generate via Drizzle.
- Never manually edit generated migration metadata (`packages/db/migrations/meta/*`).
- Keep resolvers and routes thin; move logic to services/hooks.
- Use typed errors from `@drivebase/core`.
- Always use `confirmDialog` / `promptDialog` utilities for confirm/prompt flows.

## Standard Commands
```bash
bun install
bun run dev
bun run db:generate --name <descriptive_name>
bun run db:migrate
cd apps/api && bun run codegen
cd apps/web && bun run codegen
bunx tsc --noEmit -p apps/api/tsconfig.json
bunx tsc --noEmit -p apps/web/tsconfig.json
```

## Delivery Checklist
- Run codegen when GraphQL schema/documents change.
- Run touched-area typechecks.
- Run targeted tests for changed domains.
- Report pre-existing failures clearly.
