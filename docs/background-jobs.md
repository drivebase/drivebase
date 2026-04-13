# Background Jobs

## Overview

Background jobs run inside the same binary as the HTTP server using [River](https://riverqueue.com), a PostgreSQL-backed job queue. River uses the same database as the application, so there is no additional infrastructure to deploy.

The worker pool starts alongside the HTTP server in `main.go` and shuts down gracefully on SIGINT/SIGTERM.

## Why River

River was chosen over alternatives (Redis-backed queues, separate worker services) because:
- Zero extra infra — the job queue lives in the same PostgreSQL database
- Jobs and application data share the same transaction boundary if needed
- Built-in retries, scheduling, and concurrency control
- The database is already the source of truth for job progress via `TransferJob` rows

## Worker Pool

The pool is initialized with a pgx connection pool (separate from the Ent connection) and a maximum of 20 concurrent workers. River handles job distribution across workers automatically.

On first run, River auto-migrates its own schema (queue tables, job history) into the database using `rivermigrate`.

## Dispatcher Interface

The transfer engine does not import the worker package directly — it uses a small interface:

```go
type JobDispatcher interface {
    InsertSyncJob(ctx context.Context, jobID uuid.UUID) error
}
```

The worker pool implements this interface. In production, `Engine.Dispatcher` is set to the worker pool. In E2E tests, the dispatcher is `nil`, causing the engine to fall back to running sync operations in a goroutine instead.

This decoupling means the transfer engine can be tested without River, and the worker package can be swapped without touching engine logic.

## Job Types

### `transfer_sync`

Processes a folder sync operation between two storage providers.

**Enqueued by:** `transfer.Engine.StartSync()` via the dispatcher
**Arguments:** `{ job_id: UUID }`

**Execution:**
1. Load the `TransferJob` row by ID (re-hydrates all sync options from DB)
2. Decrypt credentials and instantiate source and destination providers
3. List all files in the source folder
4. Build a filename index of the destination folder for conflict detection
5. For each source file:
   - Apply conflict strategy (SKIP or OVERWRITE)
   - Create a `TransferJobFile` row with status `running`
   - Call `streamCopy()` — downloads from source via an `io.Pipe` goroutine while uploading to destination
   - Update `TransferJobFile` to `completed` or `failed`
   - Increment `TransferJob.completed_files` / `TransferJob.failed_files` atomically
6. Mark `TransferJob` as `completed` or `failed` with a final count summary

Progress can be polled at any time via the `transferJob(id)` GraphQL query. The DB rows are the live progress state — not River's internal job state.

**Error handling:** Individual file failures do not abort the job. The job continues processing remaining files and records each failure in `TransferJobFile.error_message`. The overall job only fails if it cannot initialize (e.g. provider credentials invalid).

### `bandwidth_flush`

Periodically flushes Redis bandwidth counters to the PostgreSQL `BandwidthLog` table.

**Schedule:** Every hour (River periodic job)
**Arguments:** none

**Execution:**
1. Scan all Redis keys matching the bandwidth counter pattern
2. Skip the current hour's key (still accumulating — flush would lose in-progress data)
3. For each past-hour key:
   - Parse workspace ID, provider ID, direction, and time period from the key
   - Atomically read and delete the counter value with `GETDEL`
   - Write a `BandwidthLog` row if the value is non-zero
4. Log the number of entries flushed

Bandwidth counters use hourly Redis keys with a 25-hour TTL. The flush job runs at the top of the hour, so each key is flushed exactly once (the previous hour's data) before its TTL expires.

## Graceful Shutdown

On shutdown, `workerPool.Stop(ctx)` is called with a 15-second deadline. River stops accepting new jobs and waits for in-progress workers to finish. Jobs that do not complete within the deadline are left in a `running` state in the database — River will resume them on the next startup.

## Adding a New Job

1. Define an args struct implementing `river.JobArgs`:
   ```go
   type MyJobArgs struct {
       SomeID uuid.UUID `json:"some_id"`
   }
   func (MyJobArgs) Kind() string { return "my_job" }
   ```

2. Implement the worker:
   ```go
   type MyWorker struct {
       river.WorkerDefaults[MyJobArgs]
       // dependencies
   }
   func (w *MyWorker) Work(ctx context.Context, job *river.Job[MyJobArgs]) error {
       // implementation
       return nil
   }
   ```

3. Register the worker in `worker.New()`:
   ```go
   river.AddWorker(workers, &MyWorker{...})
   ```

4. Enqueue the job wherever needed:
   ```go
   _, err := riverClient.Insert(ctx, MyJobArgs{SomeID: id}, nil)
   ```

For periodic jobs, add a `river.PeriodicJob` entry to the River client config in `worker.New()`.
