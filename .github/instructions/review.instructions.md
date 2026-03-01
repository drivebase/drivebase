---
applyTo: "apps/api/**/*,apps/web/**/*,packages/**/*"
---

# Drivebase PR Code Review Instructions

## Review Philosophy

- Only comment when you have **HIGH CONFIDENCE (>80%)** that an issue exists.
- Be concise: one sentence per comment when possible.
- Focus on actionable feedback, not observations.
- Only flag comments/docs if the text is genuinely confusing or could lead to incorrect usage.
- **Do not comment on formatting, whitespace, import ordering, or style** — these are enforced by CI (`bun run format` / `bun run check`). Skip them entirely.

---

## Priority Areas

### P0 — Critical (always flag)

- **Security**: Missing auth checks in resolvers, credentials stored unencrypted, injection risks.
- **Data loss**: Hard deletes where soft-delete (`isDeleted: true`) is expected; destructive migrations without a safe rollout.
- **Resource leaks**: Provider instances not cleaned up via `provider.cleanup()` in a `finally` block.
- **Broken upload flow**: Failed uploads that don't clean up DB session records or temp files.

### P1 — High (flag if clearly wrong)

- **Business logic errors**: Incorrect conditions, wrong defaults, mishandled edge cases.
- **Type safety**: Use of `any`, non-null assertions (`!`) used to bypass a real null case, unsafe casts.
- **Error handling**: Missing `NotFoundError` / `ValidationError` / `ProviderError` for expected failure cases; wrong error type used.
- **DB correctness**: Missing `isDeleted` filter on queries that should exclude soft-deleted records; undefined result not checked before use.

### P2 — Medium (flag if it clearly crosses a boundary)

- **Domain leakage**: Business logic implemented directly in a GraphQL resolver instead of `apps/api/service/**`.
- **Thick routes**: Business logic in `src/routes/**` instead of a feature hook in `src/features/**/hooks/`.
- **GraphQL drift**: Resolver return shape doesn't match the schema; hand-rolled types instead of generated ones; codegen not re-run after schema changes.
- **Migration gaps**: Schema change (`packages/db/schema/*`) without a corresponding migration file or journal update.

### P3 — Low (only flag if actively misleading)

- Naming that could cause genuine confusion about what something does.
- A comment that describes the opposite of what the code does.

### Skip Entirely

- Formatting, whitespace, indentation, trailing commas, semicolons, line length
- Import ordering
- Stylistic preferences that don't affect correctness or behavior
- Observations with no actionable fix

---

## Drivebase-Specific Checklist

Use these as a mental model when reviewing diffs — only comment if something is missing or wrong.

### Provider Operations

- `provider.cleanup()` called in a `finally` block after every provider operation?
- Credentials encrypted via `apps/api/utils/encryption.ts` before being stored?
- Provider operations use `remoteId`, not the virtual path?

### GraphQL

- Resolver stays thin — delegates to `apps/api/service/**`, no inline business logic?
- Auth check present (`context.user`) for any mutation that touches user-owned data?
- Generated types used from `graphql/generated/types.ts` — not hand-rolled?
- Codegen re-run if `.graphql` schema files changed?

### Database

- Soft delete (`isDeleted: true`) used instead of hard delete where applicable?
- New required fields follow safe rollout: nullable first, backfill, then enforce not null?
- Migration file and `meta/_journal.json` updated for schema changes?
- `if (!result) throw new NotFoundError(...)` pattern used before accessing result?

### Upload / File Operations

- Failed uploads clean up both DB records (`upload_sessions`) and temp files?
- Session status transitions follow the defined state machine?
- Proxy vs presigned URL path chosen correctly based on provider capability?

### Web / Frontend

- No business logic in `src/routes/**` — only hook composition and rendering?
- Mutations with list side-effects use optimistic updates via `useOptimisticList`?
- User-facing strings wrapped in Lingui (`Trans` or equivalent)?
- shadcn/ui components used — no custom base UI components introduced?

---

## Comment Format

Use this format for comments:

> **[P0]** `provider.cleanup()` is missing in the catch path — the provider instance will leak on error.

> **[P1]** This can return `undefined` but the resolver type expects `string` — will throw at runtime.

> **[P2]** This logic belongs in `service/file/mutation/` not in the resolver.

Omit the priority tag for minor P3 notes. Do not post a comment just to confirm that code looks fine.
