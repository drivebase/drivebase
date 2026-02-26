# AGENTS.md

This file defines repository-wide engineering standards for agents working in `drivebase`.

## 1) Core Principles

- Keep domains isolated. Do not mix unrelated business logic in one file/module.
- Prefer DDD-style boundaries: each domain owns its models, operations, and orchestration.
- Separate read vs write paths clearly.
- Keep files focused and composable: one file, one primary responsibility.
- Preserve behavior unless explicitly changing product requirements.

## 2) Monorepo Boundaries

- `apps/api`: GraphQL API + domain services + workers.
- `apps/web`: frontend application (TanStack Router + React + urql).
- `packages/*`: shared packages (`db`, `core`, `utils`, provider SDKs).

Do not place app-specific logic into shared packages unless it is genuinely reusable.

## 3) API Architecture (`apps/api`)

### 3.1 Schema-first GraphQL

- GraphQL schema is source of truth (`apps/api/graphql/schema/*.graphql`).
- Resolver implementations must match generated types.
- After schema/document changes, run codegen and typecheck.

### 3.2 Resolver Responsibilities

- Resolvers should be thin orchestration layers only.
- Business logic belongs in `apps/api/service/**`.
- Keep resolvers domain-scoped (`activity.ts`, `provider.ts`, `workspace.ts`, etc.).

### 3.3 Query/Mutation Split (Required)

Within each domain service, use:

- `query/` for reads
- `mutation/` for writes/side-effects
- `shared/` for reusable internal helpers/types
- `index.ts` as explicit domain exports

Examples already present:

- `apps/api/service/provider/query/*`
- `apps/api/service/provider/mutation/*`
- `apps/api/service/file/query/*`
- `apps/api/service/file/mutation/*`
- `apps/api/service/rule/query/*`
- `apps/api/service/rule/mutation/*`

### 3.4 Service Layer Rules

- Orchestrators may live in top-level domain files (`service/provider.ts`, `service/activity.ts`) and compose query/mutation modules.
- Prefer explicit input/output interfaces for exported functions.
- Use shared typed errors from `@drivebase/core` (`ValidationError`, `NotFoundError`, `ConflictError`, etc.).
- Ensure resource cleanup in `finally` blocks (provider clients, file handles, streams).

### 3.5 Job vs Activity Semantics (Do not mix)

- `jobs`: realtime mutable progress stream (pending/running/completed/error, progress 0..1).
- `activities`: immutable history/messages (success/error/info/completion summaries).
- Realtime panel UIs must consume jobs; history lists consume activities.

## 4) Web Architecture (`apps/web`)

### 4.1 Route and Feature Boundaries

- Keep routes thin (`src/routes/**`): mount views/hooks, avoid domain logic.
- Domain logic belongs in feature hooks/services/stores (`src/features/**`, `src/shared/**`).

### 4.2 Hooks and Logic Separation (Required)

- One hook = one data concern.
- Split independent feeds/concerns into separate hooks/files.
- Do not create mega-hooks that combine unrelated domains.

Example pattern to follow:

- `useJobsFeed` for job stream ingestion
- `useActivityFeed` for activity stream ingestion

### 4.3 UI Responsibility

- Component files should focus on rendering and interaction.
- Move reusable logic to colocated util files (`*Utils.ts`) when complexity grows.
- Prefer clear component names by intent (`JobPanel` vs generic names when domain is specific).

### 4.4 Store Design

- Zustand stores should model domain state explicitly.
- Keep actions minimal, deterministic, and typed.
- Avoid implicit cross-domain writes in a single action.

## 5) File Organization Standards

- Use `index.ts` barrels at domain boundaries only.
- Avoid circular imports and deep cross-domain relative paths.
- Keep naming consistent with domain language.
- Delete obsolete files after replacement/refactor in same change.

## 6) TypeScript Standards

- Strict typing required.
- Do not introduce `any` without explicit justification.
- Avoid unsafe non-null assertions.
- Exported functions should have clear return behavior.
- Prefer small typed helpers over ad-hoc inline casting.

## 7) Data and Persistence Rules

- DB schema changes must be reflected in `packages/db/schema/*`.
- Add migrations for schema changes (unless explicitly instructed otherwise).
- For new required fields, rollout safely (nullable/backfill/enforce).
- Never implement UI-only clearing by deleting persisted history unless requested.

## 8) Operational/Worker Standards

- Queue workers must emit durable terminal outcomes (success/failure) to activity history.
- Keep progress updates in job stream.
- Include sufficient metadata (`jobId`, `fileId`, `providerId`, etc.) for observability.

## 9) Quality Gates

Before finishing changes:

- Run codegen if GraphQL schema/documents changed.
- Run relevant typechecks:
  - `bunx tsc --noEmit -p apps/web/tsconfig.json`
  - `bunx tsc --noEmit -p apps/api/tsconfig.json`
- Run targeted tests for touched domains.
- If failures are pre-existing, state that explicitly and do not mask them.

## 10) Change Hygiene

- Keep commits scoped and reviewable.
- Do not mix unrelated refactors with product behavior changes unless asked.
- Maintain backward compatibility unless migration is intentional and documented.
- Prefer conventional commits (`feat`, `fix`, `refactor`, `chore`, etc.) with accurate scope.

