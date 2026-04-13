# Drivebase — Claude Code Guide

## Project overview

Self-hosted file management platform. Single Go binary (API server + River background worker). GraphQL API (gqlgen) for most operations, REST for binary streaming (upload/download/templinks). PostgreSQL for persistence, Redis for caching and bandwidth tracking, MinIO/S3 for object storage.

## Commands

```bash
make generate    # Ent ORM + gqlgen code generation
make build       # Compile binary to bin/drivebase
make run         # Build and run (requires config)
make test        # Unit tests with race detector
make e2e         # E2E tests (spins up testcontainers automatically)
make up          # Start local dev stack (compose.yml)
make down        # Stop local dev stack
make lint        # golangci-lint
make tidy        # go mod tidy
```

## Architecture

- **Single process**: API server and River worker run in the same binary, wired together in `cmd/drivebase/main.go`.
- **Stateless API**: JWT access tokens (15 min) + DB-backed refresh tokens. Enables horizontal scaling.
- **Upload/download via REST** (not GraphQL) — binary streaming is incompatible with GraphQL JSON transport.
- **Background jobs via River** (PG-backed queue) — zero extra infrastructure, retries built-in, shares the same database.
- **Redis is optional** — file tree cache and bandwidth tracking degrade gracefully if Redis is unavailable.
- **Ent driver pattern**: Open with `sql.Open("pgx", dsn)` + `entsql.OpenDB(dialect.Postgres, db)` + `ent.NewClient(ent.Driver(...))`. Do NOT use `ent.Open("pgx", ...)` — Ent only accepts `"postgres"` as dialect string, but the pgx stdlib driver registers as `"pgx"`.

## Code generation

Two generators are in play. Run them separately, never together:

**Ent ORM** (`make generate` → `go generate ./internal/ent/...`):
- Regenerates all files under `internal/ent/` except `internal/ent/schema/`
- After changing any schema file, run this and commit the output

**gqlgen** (run manually: `go run github.com/99designs/gqlgen generate`):
- Regenerates `internal/graph/generated.go` and `internal/graph/models_gen.go`
- Resolver files (`*.resolvers.go`) are partially regenerated — existing implementations are preserved in a `// !!! WARNING !!!` block at the bottom, then deleted on the next run
- **Rule**: Never put helper functions or non-resolver code in `*.resolvers.go` files. Always put them in a matching `*_helpers.go` file (e.g. `file_helpers.go`) that gqlgen never touches.

## GraphQL schema conventions

- **Enum values**: Use SCREAMING_SNAKE_CASE (e.g. `SKIP`, `OVERWRITE`, `S3`). Lowercase enum values will break clients.
- **ID field names in inputs**: Use `workspaceID`, `fileNodeID`, `providerID` — full uppercase suffix. This is what the generated Go structs and the validation layer expect.
- **ID field names in query/mutation arguments** (not inside inputs): Same convention — `fileNodeID`, not `fileNodeId`.
- When adding new enum values or input fields, update the corresponding constants in `models_gen.go` to keep them in sync (gqlgen must be re-run or the file patched manually).

## Provider system

- All providers implement the `storage.Provider` interface.
- Provider type string is `"S3"`, `"google_drive"`, `"local"` — uppercase S3.
- Credentials are stored as a single AES-256-GCM encrypted JSON blob per provider.
- The registry uses `init()` functions for registration — import the package to register.

## Testing

**Unit tests**: Live in `*_test.go` files alongside the package. Use:
- `miniredis` for Redis-dependent tests
- `httptest.Server` for Google Drive mock
- `testcontainers` S3/MinIO module for S3 tests
- `t.TempDir()` for local storage tests
- River test helpers for worker tests

**E2E tests** (`e2e/`): Use testcontainers to spin up real Postgres, Redis, and MinIO containers. No external services needed — `go test ./e2e/... -timeout 10m` is self-contained. Each test calls `setupSuite(t)` which starts fresh containers and an `httptest.Server`.

Do not mock the database in tests — use real containers or in-memory equivalents (miniredis). Mocked DB tests have caused prod regressions in the past.

## Key invariants

- `ListFiles` enriches the storage listing with database UUIDs by querying for existing `FileNode` records by `(providerID, remoteID)`. Without this, returned `FileNode.ID` fields would be zero UUIDs.
- The upload REST handler accepts `provider_id` as either a form field or a query param, and accepts the file under either `"file"` or `"files"` field names.
- Shared link auth: REST download endpoints check JWT first, then fall back to `X-Share-Token` header via the sharing middleware. Temp links (`/api/v1/templink/`) are stateless HMAC-signed URLs — no JWT or share token needed.
- Migrations are auto-applied via `client.Schema.Create(ctx)` on startup. Switch to Atlas versioned migrations before the first production release.
