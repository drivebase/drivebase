---
description: Strict engineering standards for Drivebase (Bun-first, API/Web conventions, refactor/file-change rules)
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# Runtime and Tooling (Bun-first)

- Use Bun by default.
- Use `bun <file>` instead of `node`/`ts-node`.
- Use `bun test` for tests.
- Use `bun install` for dependencies.
- Use `bun run <script>` for package scripts.
- Use `bunx <pkg> <cmd>` instead of `npx`.
- Do not add `dotenv` unless explicitly required (Bun loads `.env`).

# Repository Scope

- The repo has two primary app areas:
- `apps/api` for backend/API code.
- `apps/web` for frontend/web app code.
- Keep domain boundaries clear; avoid cross-app coupling.

# TypeScript and Safety Rules

- Never use `any`.
- Never use non-null assertion (`!`) to bypass checks.
- Validate inputs and throw descriptive errors.
- Prefer explicit return types for exported functions.
- Convert nullable DB/API values to optional params using `value ?? undefined` where needed.
- Keep `bunx tsc --noEmit -p apps/api/tsconfig.json` and web typecheck clean when touching related areas.

# Import and Path Rules

- Use path alias imports with the generic `@/*` mapping where configured.
- Prefer stable domain imports over deep relative chains when possible.
- Public module surfaces should be exported through `index.ts` barrels.
- Avoid `export-file.ts` patterns; use `index.ts` in each module boundary.

# API Architecture Rules (`apps/api`)

- Keep GraphQL schema and resolver signatures backward compatible unless a change is explicitly requested.
- Use schema-first GraphQL workflow and regenerate types after schema/document changes.
- Use Drizzle ORM patterns consistently and preserve soft-delete behavior.
- Use shared errors from `@drivebase/core` (`ValidationError`, `NotFoundError`, `ConflictError`, etc.).
- Always clean up provider instances (`provider.cleanup()`) in `finally` blocks.

# Refactor and File-Change Standards

- For refactors, preserve external behavior and public APIs.
- Prefer domain split by responsibility:
- `query/` for read operations.
- `mutation/` for write operations (including star/unstar style state changes).
- `shared/` only for reusable internal helpers.
- For large domains, use one exported function per file.
- Keep touched non-generated source files at or below `200 LOC` when practical.
- Generated files are exempt from LOC limits.
- Add short comments only where needed; max 1-2 lines per function, no obvious narration.
- Remove obsolete grouped files after migration and update imports in the same change.

# Naming and Consistency Rules

- Use singular domain naming where the codebase standard is singular (example: `rule`, not `rules`).
- Keep naming consistent across service, query, and mutation modules.
- Do not introduce parallel naming schemes for the same domain.

# Testing and Validation Rules

- Run targeted tests for touched domains.
- Run GraphQL regression tests when resolver/service internals are changed.
- If typecheck has pre-existing failures, do not hide them; report clearly what is pre-existing vs new.
- Refactor PRs should include verification commands and outcomes.

# Database and Migration Rules

- Any schema change must include:
- schema updates in `packages/db/schema/*`.
- SQL migration in `packages/db/migrations/*`.
- migration journal updates when required.
- For required new fields, use safe rollout strategy: add nullable -> backfill -> enforce not null.

# Web App Rules (`apps/web`)

- Keep route files thin; business logic belongs in feature hooks/services.
- Reuse shared primitives before creating new variants.
- Keep optimistic UI behavior consistent where already established.
- Preserve UX stability: avoid loading/layout flicker and maintain consistent action placement.

# PR/Change Hygiene

- Keep changes scoped to requested domains.
- Do not mix unrelated refactors with behavior changes.
- Document assumptions and follow-ups when deferring work.
- Prefer incremental, reviewable commits with clear `refactor:` messages for structural-only changes.
