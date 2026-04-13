package worker

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/riverqueue/river"

	"github.com/drivebase/drivebase/internal/cache"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	"github.com/drivebase/drivebase/internal/ent"
)

// BandwidthFlushArgs is the periodic job payload (no fields needed).
type BandwidthFlushArgs struct{}

func (BandwidthFlushArgs) Kind() string { return "bandwidth_flush" }

// BandwidthFlushWorker reads hourly bandwidth counters from Redis and writes
// them to the bandwidth_log table, then deletes the Redis keys.
type BandwidthFlushWorker struct {
	river.WorkerDefaults[BandwidthFlushArgs]
	db      *ent.Client
	counter *cache.BandwidthCounter
}

func (w *BandwidthFlushWorker) Work(ctx context.Context, _ *river.Job[BandwidthFlushArgs]) error {
	if w.counter == nil {
		return nil // Redis not configured
	}

	entries, err := w.counter.FlushCounters(ctx)
	if err != nil {
		return fmt.Errorf("bandwidth flush: read counters: %w", err)
	}

	for _, e := range entries {
		direction := string(entschema.BandwidthDirectionUpload)
		if e.Direction == "download" {
			direction = string(entschema.BandwidthDirectionDownload)
		}

		_, err := w.db.BandwidthLog.Create().
			SetWorkspaceID(e.WorkspaceID).
			SetProviderID(e.ProviderID).
			SetDirection(direction).
			SetBytes(e.Bytes).
			SetPeriodStart(e.PeriodStart).
			SetPeriodEnd(e.PeriodEnd).
			Save(ctx)
		if err != nil {
			slog.Warn("bandwidth flush: write log entry", "error", err,
				"workspace", e.WorkspaceID, "provider", e.ProviderID)
		}
	}

	if len(entries) > 0 {
		slog.Info("bandwidth flush complete", "entries", len(entries))
	}
	return nil
}
