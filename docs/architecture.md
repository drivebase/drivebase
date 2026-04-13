# Architecture Overview

## What Drivebase Is

Drivebase is a self-hosted file management platform. It presents a unified API over multiple storage backends (Google Drive, S3/MinIO, local filesystem) from a single process. Users organize files through workspaces, control access through roles, and can share files publicly or transfer them between providers.

## Single-Binary Design

The entire platform runs as one Go binary: the HTTP server, the GraphQL API, and the background job worker all live in the same process. There is no separate worker service to deploy or keep in sync.

```
┌─────────────────────────────────────────────────┐
│                  drivebase binary                 │
│                                                   │
│  ┌──────────────┐       ┌─────────────────────┐  │
│  │  HTTP Server │       │   River Worker Pool  │  │
│  │  (chi router)│       │  (background jobs)   │  │
│  │              │       │                      │  │
│  │  /graphql    │       │  - transfer_sync     │  │
│  │  /api/v1/    │       │  - bandwidth_flush   │  │
│  └──────┬───────┘       └──────────┬──────────┘  │
│         │                          │              │
│         └──────────┬───────────────┘              │
│                    │                              │
│            ┌───────┴────────┐                    │
│            │  Internal Pkgs │                    │
│            │  auth, storage │                    │
│            │  transfer,     │                    │
│            │  sharing, cache│                    │
│            └───────┬────────┘                    │
└────────────────────┼────────────────────────────-┘
                     │
        ┌────────────┼─────────────┐
        │            │             │
   PostgreSQL       Redis     Storage Backends
   (primary store   (cache,   (S3, Google Drive,
    + job queue)    bw track)  local filesystem)
```

This design simplifies deployment significantly — one container, one config, one process to monitor. Horizontal scaling is possible because the API is stateless (JWT tokens, no local session state). River uses PostgreSQL for its job queue, so multiple instances can share the same queue safely.

## Package Structure

```
internal/
├── auth/          JWT issuance, session management, RBAC engine, middleware
├── cache/         Redis file-tree cache, bandwidth counters, disk LRU cache
├── config/        Configuration loading (Viper, env vars, config file)
├── crypto/        AES-256-GCM encryption for provider credentials
├── ent/           Generated ORM code + schema definitions
│   └── schema/    Hand-written Ent schema files (the only files to edit here)
├── graph/         GraphQL layer
│   ├── resolver/  Resolver implementations (hand-written) + gqlgen-generated stubs
│   └── schema/    .graphqls schema files
├── server/        chi router setup, REST handlers (upload, download, templink)
├── sharing/       Shared link CRUD, validation, HTTP middleware
├── storage/       Provider interface, registry, type definitions
│   ├── googledrive/
│   ├── s3/
│   └── local/
├── templink/      HMAC-signed temporary download URL signing and verification
├── transfer/      Transfer/sync engine, streaming copy, job dispatch
└── worker/        River worker pool setup, job type definitions
```

## Data Flow: Typical Request

```
Client
  │
  ├─ POST /graphql ──────────► chi router
  │                                │
  │                         middleware chain
  │                         (requestID, CORS, auth extractor,
  │                          share token extractor)
  │                                │
  │                         gqlgen handler
  │                                │
  │                         resolver function
  │                          ├─ auth.Check (RBAC)
  │                          ├─ ent.Client (DB query)
  │                          └─ storage.Provider (if needed)
  │                                │
  └─◄────────────────────── JSON response

  ├─ POST /api/v1/upload ───────► upload handler
  │                                │
  │                          multipart parse
  │                          provider.Upload()
  │                          FileNode created in DB
  │                                │
  └─◄────────────────── upload batch result JSON

  └─ GET /api/v1/download/{id} ──► download handler
                                    │
                               auth check (JWT or share token)
                               provider.Download()
                               io.Copy to response writer
```

## Data Flow: Background Sync Job

```
GraphQL mutation: startFolderSync
  │
  ├─ Creates TransferJob row (status: running)
  │
  ├─ Engine.StartSync()
  │   ├─ If River dispatcher: insert River job → returns immediately
  │   └─ If no dispatcher (E2E): run goroutine → returns immediately
  │
  └─ Returns TransferJob to client

River worker (async):
  │
  ├─ SyncWorker.Work(jobID)
  │   └─ Engine.RunSync(jobID)
  │       ├─ Load job + providers from DB
  │       ├─ List source files
  │       ├─ For each file:
  │       │   ├─ streamCopy() via io.Pipe
  │       │   ├─ Update TransferJobFile
  │       │   └─ Update TransferJob counters
  │       └─ Mark job completed/failed
  │
  └─ Client polls: transferJob(id) { status completedFiles }
```

## Technology Choices

| Concern | Choice | Reason |
|---|---|---|
| Language | Go | Low overhead, strong stdlib for streaming, good concurrency |
| ORM | Ent | Type-safe schema, code generation, good PostgreSQL support |
| API | GraphQL (gqlgen) | Type-safe resolvers, single endpoint for complex queries |
| Binary streaming | REST (`/api/v1/`) | GraphQL JSON transport is incompatible with file streams |
| Job queue | River (PG-backed) | No extra infra, retries/scheduling built-in, same DB as app |
| Router | chi | Lightweight, composable middleware |
| Config | Viper | Env var + file + defaults in one library |
| Logging | slog (stdlib) | Structured, zero deps, JSON in prod / text in dev |

## Key Design Principles

**Stateless API tokens** — Access tokens are JWTs verified by signature alone. The server needs no session lookup for authorization, only for token refresh. This means any API server instance can handle any request.

**Streaming transfers** — Files are never buffered fully in memory. Downloads and cross-provider transfers use `io.Pipe`: one goroutine reads from the source while the main goroutine writes to the destination, bounded by pipe capacity.

**Zero-knowledge credentials** — Provider credentials (OAuth tokens, access keys, etc.) are AES-256-GCM encrypted before hitting the database. The encryption key lives in config only; compromising the database alone is not sufficient to access provider accounts.

**Graceful Redis degradation** — Redis is optional. If unavailable at startup, file tree caching and bandwidth tracking are disabled but the core API continues operating normally.

**DB as source of truth for jobs** — `TransferJob` and `UploadBatch` rows in PostgreSQL are the authoritative progress tracking records, not River job state. This means job progress survives worker restarts and is queryable via GraphQL.
