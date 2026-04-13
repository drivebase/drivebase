// Package worker runs River background jobs for transfer sync and bandwidth flushing.
package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"

	"github.com/drivebase/drivebase/internal/cache"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/transfer"
)

const maxWorkers = 20

// Pool holds the River client and exposes Start/Stop for lifecycle management.
type Pool struct {
	client *river.Client[pgx.Tx]
}

// New creates and migrates the River schema, registers all workers, and returns a Pool.
// Call Pool.Start(ctx) to begin processing.
func New(
	ctx context.Context,
	pgPool *pgxpool.Pool,
	db *ent.Client,
	encKey string,
	bwCounter *cache.BandwidthCounter,
) (*Pool, *transfer.Engine, error) {
	// Run River schema migrations
	migrator, err := rivermigrate.New(riverpgxv5.New(pgPool), nil)
	if err != nil {
		return nil, nil, fmt.Errorf("worker: river migrator: %w", err)
	}
	if _, err := migrator.Migrate(ctx, rivermigrate.DirectionUp, nil); err != nil {
		return nil, nil, fmt.Errorf("worker: river migrate: %w", err)
	}

	p := &Pool{}

	engine := &transfer.Engine{DB: db, EncKey: encKey, Dispatcher: p}

	workers := river.NewWorkers()
	river.AddWorker(workers, &SyncWorker{engine: engine})
	river.AddWorker(workers, &BandwidthFlushWorker{db: db, counter: bwCounter})

	periodicJobs := []*river.PeriodicJob{
		river.NewPeriodicJob(
			river.PeriodicInterval(time.Hour),
			func() (river.JobArgs, *river.InsertOpts) {
				return BandwidthFlushArgs{}, nil
			},
			&river.PeriodicJobOpts{RunOnStart: false},
		),
	}

	client, err := river.NewClient(riverpgxv5.New(pgPool), &river.Config{
		Queues: map[string]river.QueueConfig{
			river.QueueDefault: {MaxWorkers: maxWorkers},
		},
		Workers:      workers,
		PeriodicJobs: periodicJobs,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("worker: river client: %w", err)
	}
	p.client = client

	return p, engine, nil
}

// Start begins processing jobs. Non-blocking — runs worker goroutines in background.
func (p *Pool) Start(ctx context.Context) error {
	return p.client.Start(ctx)
}

// Stop drains in-progress jobs and shuts down the worker pool.
func (p *Pool) Stop(ctx context.Context) error {
	return p.client.Stop(ctx)
}

// InsertSyncJob implements transfer.JobDispatcher.
func (p *Pool) InsertSyncJob(ctx context.Context, jobID uuid.UUID) error {
	_, err := p.client.Insert(ctx, SyncJobArgs{JobID: jobID}, nil)
	return err
}
