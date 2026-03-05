---
name: db-design-migrations
description: Design Drivebase database changes and execute safe Drizzle migrations using the repo’s Bun workflow.
---

## Overview

Use this skill when a feature needs DB design decisions, schema changes, or migrations.

Stack assumptions (current repo):
- Bun workspace scripts at root (`db:generate`, `db:migrate`, `db:studio`)
- Drizzle ORM + drizzle-kit
- PostgreSQL
- Schema lives in `packages/db/schema/*`
- Migrations live in `packages/db/migrations/*`

## Rules (must follow)

- Never hand-write migration SQL.
- Never manually edit `packages/db/migrations/meta/_journal.json` or snapshot files.
- Always generate migrations from schema changes:
  - `bun run db:generate --name <descriptive_name>`
- Preserve backward compatibility unless explicitly approved.
- For new required fields: nullable -> backfill -> enforce not null.
- Keep soft-delete behavior (`isDeleted`) where the domain already uses it.

## Design checklist (before coding)

1. Define domain intent:
   - What entity/state is missing?
   - Is this a new table, enum value, column, or constraint?
2. Map ownership:
   - DB schema (`packages/db/schema/*`)
   - API read/write services (`apps/api/service/**`)
   - GraphQL schema/resolvers (if API contract changes)
   - Web feature hooks/components (if UI depends on new fields)
3. Decide compatibility:
   - Can old code run during rollout?
   - Do we need phased migration/backfill?
4. Define data safety:
   - Indexes/uniques needed?
   - FK `onDelete` behavior (`cascade` vs `set null`)?

## Schema conventions in this repo

- IDs: `text("id").primaryKey().$defaultFn(() => createId())`
- Timestamps: `timestamp("<name>", { withTimezone: true })`
- Most tables include `createdAt` and `updatedAt` with `.defaultNow()`
- Enums: `pgEnum(...)` defined near related table
- Types: always export `<Type>` and `New<Type>` from schema file
- Add new schema exports in `packages/db/schema/index.ts`

## Implementation workflow

1. Update/add schema files under `packages/db/schema/`.
2. Export new schema module from `packages/db/schema/index.ts` (if new file).
3. Generate migration from repo root:
```bash
bun run db:generate --name <descriptive_name>
```
4. Review generated migration for correctness (do not hand-edit).
5. Apply migrations:
```bash
bun run db:migrate
```
6. If DB changes affect API contract, run GraphQL codegen:
```bash
cd apps/api && bun run codegen
cd apps/web && bun run codegen
```
7. Run typechecks for touched apps:
```bash
bunx tsc --noEmit -p apps/api/tsconfig.json
bunx tsc --noEmit -p apps/web/tsconfig.json
```

## Output format for planning responses

- Change summary
- DB design decisions (with tradeoffs)
- Files to modify (exact paths)
- Migration plan (including phased rollout if needed)
- Validation commands
- Risks + rollback/mitigation plan
- Approval checklist

## Notes on rollback

- Prefer forward-fix migrations over destructive rollback.
- If a migration is unsafe for live traffic, split into phases and gate behavior in API until backfill completes.
