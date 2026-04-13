# Development Guide

## Prerequisites

- Go 1.22+
- Docker (for local dev stack and E2E tests)
- `golangci-lint` (for linting)

## Local Setup

1. Copy the example config:
   ```bash
   cp config.example.toml config.toml
   ```

2. Start the local infrastructure:
   ```bash
   make up
   ```
   This starts PostgreSQL, Redis, and MinIO via `compose.yml`.

3. Build and run:
   ```bash
   make run
   ```
   The server starts on `localhost:8080` by default. On first run, Ent auto-migrates the schema.

4. To stop the stack:
   ```bash
   make down
   ```

## Configuration

Config is loaded from `config.toml` (if present), environment variables (prefixed `DRIVEBASE_`), and hardcoded defaults — in that priority order.

Key values that must be set before running:

| Key | Env var | Description |
|---|---|---|
| `database.dsn` | `DRIVEBASE_DATABASE_DSN` | PostgreSQL connection string |
| `auth.jwt_secret` | `DRIVEBASE_AUTH_JWT_SECRET` | HS256 signing key (min 32 chars) |
| `crypto.encryption_key` | `DRIVEBASE_CRYPTO_ENCRYPTION_KEY` | AES key for provider credentials (exactly 32 chars) |

Redis (`redis.url`) is optional — see [caching.md](caching.md).

## Running Tests

**Unit tests** (no Docker required):
```bash
make test
# or
go test ./... -count=1 -race
```

Unit tests use:
- `miniredis` for Redis-dependent packages
- `testcontainers` S3/MinIO module for S3 provider tests
- `httptest.Server` for Google Drive mock tests
- `t.TempDir()` for local filesystem provider tests

**E2E tests** (Docker required, no manual setup needed):
```bash
make e2e
# or
go test ./e2e/... -v -timeout 10m
```

E2E tests use `testcontainers-go` to spin up real PostgreSQL, Redis, and MinIO containers automatically. Each test gets its own isolated stack — no shared state between tests. Containers are torn down via `t.Cleanup`.

## Code Generation

Two code generators run independently. Run them after making schema changes — do not run them together.

### Ent ORM

Run after modifying any file under `internal/ent/schema/`:

```bash
make generate
# or
go generate ./internal/ent/...
```

This regenerates everything under `internal/ent/` except the schema files themselves. Commit the generated output.

The only files you should ever edit manually in `internal/ent/` are the schema files in `internal/ent/schema/`.

### gqlgen

Run after modifying any `.graphqls` file or `gqlgen.yml`:

```bash
go run github.com/99designs/gqlgen generate
```

This regenerates:
- `internal/graph/generated.go` — execution engine, input unmarshalers, field resolvers
- `internal/graph/models_gen.go` — Go types for all GraphQL types, inputs, and enums

Resolver files (`internal/graph/resolver/*.resolvers.go`) are partially regenerated: existing resolver implementations are preserved but moved into a `// !!! WARNING — DO NOT EDIT !!!` block at the bottom. On the next generate, that block is deleted. This means:

**Rule**: Never put non-resolver code (helpers, utilities, type conversions) inside `*.resolvers.go` files. Put them in a sibling `*_helpers.go` file (e.g. `file_helpers.go`, `sharing_helpers.go`). gqlgen never touches `*_helpers.go` files.

After running gqlgen, check the WARNING block at the bottom of each resolver file and move any preserved code back to the correct location.

## GraphQL Schema Conventions

When adding fields, types, or mutations to `.graphqls` files:

- **Enum values**: Use SCREAMING_SNAKE_CASE — `SKIP`, `OVERWRITE`, `S3`. Lowercase values fail client validation.
- **ID field names**: Use the full uppercase suffix — `workspaceID`, `fileNodeID`, `providerID`. This is what the generated Go structs expect and what the validation layer checks.
- After changing an enum value or adding new enum variants, update the corresponding constants in `models_gen.go` to keep them in sync (or re-run gqlgen).

## Adding a New Storage Provider

1. Create a package under `internal/storage/<name>/`
2. Implement all methods of `storage.Provider`
3. Add an `init()` function that calls `storage.Register(storage.ProviderType<Name>, factoryFunc)`
4. Import the package as a blank import somewhere in the binary:
   ```go
   _ "github.com/drivebase/drivebase/internal/storage/<name>"
   ```
5. Add the new `ProviderType` constant to `internal/storage/types.go`
6. Add the new enum value to `internal/graph/schema/provider.graphqls` and `internal/graph/models_gen.go`
7. Add credentials documentation and the JSON shape to [storage-providers.md](storage-providers.md)

Write unit tests using an `httptest.Server` (for API-based providers) or a real testcontainer (for protocol-based ones like S3).

## Adding a New Background Job

1. Define an args struct in `internal/worker/`:
   ```go
   type MyJobArgs struct {
       ID uuid.UUID `json:"id"`
   }
   func (MyJobArgs) Kind() string { return "my_job" }
   ```

2. Implement the worker struct:
   ```go
   type MyWorker struct {
       river.WorkerDefaults[MyJobArgs]
       // inject dependencies here
   }
   func (w *MyWorker) Work(ctx context.Context, job *river.Job[MyJobArgs]) error { ... }
   ```

3. Register in `worker.New()`:
   ```go
   river.AddWorker(workers, &MyWorker{dep: dep})
   ```

4. For periodic jobs, add to the River client periodic jobs config:
   ```go
   river.NewPeriodicJob(river.PeriodicInterval(time.Hour), func() (river.JobArgs, *river.InsertOpts) {
       return MyJobArgs{}, nil
   }, nil)
   ```

See [background-jobs.md](background-jobs.md) for the full job lifecycle.

## Database Migrations

During development, `client.Schema.Create(ctx)` is called on every startup to auto-migrate the schema. This is intentional and safe for development — Ent's auto-migration is additive only (it adds columns and tables but never drops).

Before the first production release:
1. Switch to Atlas versioned migrations
2. Generate an initial migration from the current schema: `atlas migrate diff`
3. Apply migrations explicitly rather than auto-migrating on startup

## Project Layout Rules

- `internal/ent/schema/` — only hand-edited files in the whole `internal/ent/` tree
- `internal/graph/resolver/*_helpers.go` — helper functions safe from gqlgen regeneration
- `internal/graph/resolver/*.resolvers.go` — resolver implementations only, no helpers
- `internal/graph/schema/*.graphqls` — schema definitions; one file per domain area
- `internal/storage/<name>/` — one package per provider backend
- `internal/worker/` — one file per job type plus `worker.go` for pool setup
- `e2e/` — end-to-end tests only; unit tests live alongside their packages
