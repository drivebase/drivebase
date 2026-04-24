# Agents

Guidelines for AI agents working in this repository.

## Repository Layout

This is a Turborepo monorepo.

- `apps/` — runnable services (API server, web frontend, background workers)
- `packages/` — shared libraries consumed by apps and each other

## Tooling

- Runtime: **Bun** — use `bun` for all installs, scripts, and execution. Never use `node`, `npm`, `pnpm`, or `yarn`.
- Build system: **Turborepo** — run tasks via `bun run <script>` at the root or within a workspace.
- Language: TypeScript throughout. Strict mode is on.

## Stack

- **Frontend**: React 19, Vite, TanStack Router
- **API**: GraphQL Yoga with SSE via graphql-sse
- **Workers**: BullMQ
- **Database**: Drizzle ORM over PostgreSQL (postgres-js)
- **Cache**: Redis (ioredis)
- **Auth**: Cookie-based via Better Auth — never use Bearer tokens or localStorage for auth state
- **UI**: Custom design system built on Radix UI primitives — do not introduce shadcn/ui or cva

## Code Style

- TypeScript: no `as any`, no `as unknown as X` — fix the real type
- No unnecessary comments; code should be self-explanatory
- No half-finished implementations or speculative abstractions
- Do not ship workaround-style fixes, bandaids, or timing hacks to mask root causes; implement the underlying fix or leave the limitation explicit
- Prefer editing existing files over creating new ones
- Do not add error handling for scenarios that cannot happen

## Before Submitting Changes

1. `bun run typecheck` — must pass with zero errors
2. `bun test` — all tests must pass
3. Verify the relevant app builds: `bun run build`
4. For UI changes, confirm the visual result in a browser before marking done

## Environment

- Copy `.env.example` to `.env` and fill in required values before running services locally
- Bun loads `.env` automatically — do not use dotenv
- Each app may have its own env vars; check the app-level `.env.example`

## Database

- Schema lives in the `db` package
- Generate migrations after schema changes: `bun run db:generate`
- Apply migrations: `bun run db:migrate`
- Never edit migration files after they have been applied

## Out of Scope

Do not perform any of the following without explicit user confirmation:

- Force-push or destructive git operations
- Dropping database tables or running irreversible migrations
- Pushing to remote or creating PRs
- Modifying CI/CD configuration
