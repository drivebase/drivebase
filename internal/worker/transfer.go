package worker

import (
	"context"

	"github.com/google/uuid"
	"github.com/riverqueue/river"

	"github.com/drivebase/drivebase/internal/transfer"
)

// SyncJobArgs is the payload enqueued when a folder sync is started.
type SyncJobArgs struct {
	JobID uuid.UUID `json:"job_id"`
}

func (SyncJobArgs) Kind() string { return "transfer_sync" }

// SyncWorker processes a folder sync job by delegating to the transfer engine.
type SyncWorker struct {
	river.WorkerDefaults[SyncJobArgs]
	engine *transfer.Engine
}

func (w *SyncWorker) Work(ctx context.Context, job *river.Job[SyncJobArgs]) error {
	w.engine.RunSync(ctx, job.Args.JobID)
	// RunSync persists errors to the DB record; never surface them as River retries
	// because progress is already tracked row-by-row.
	return nil
}
