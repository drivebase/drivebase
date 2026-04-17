// Package transfer implements cross-provider file transfer and folder sync.
// Files are streamed directly between providers via io.Pipe — no temporary
// storage or full in-memory buffering.
package transfer

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/drivebase/drivebase/internal/ent"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/google/uuid"
)

// JobDispatcher enqueues a River sync job by transfer job ID.
// Set on Engine when the River worker pool is running; nil = goroutine fallback.
type JobDispatcher interface {
	InsertSyncJob(ctx context.Context, jobID uuid.UUID) error
}

// Engine executes cross-provider transfers and syncs.
type Engine struct {
	DB         *ent.Client
	EncKey     string
	Dispatcher JobDispatcher // optional; nil → goroutine
}

// SyncOptions describes a folder-to-folder sync between two providers.
type SyncOptions struct {
	UserID               uuid.UUID
	SourceProviderID     uuid.UUID
	SourceFolderRemoteID string // "" = root
	DestProviderID       uuid.UUID
	DestFolderRemoteID   string // "" = root
	ConflictStrategy     entschema.ConflictStrategy
}

// StartSync creates a TransferJob record and begins the sync in the background.
// Returns the job immediately so the caller can poll for progress.
func (e *Engine) StartSync(ctx context.Context, opts SyncOptions) (*ent.TransferJob, error) {
	job, err := e.DB.TransferJob.Create().
		SetUserID(opts.UserID).
		SetSourceProviderID(opts.SourceProviderID).
		SetDestProviderID(opts.DestProviderID).
		SetSourceFolderRemoteID(opts.SourceFolderRemoteID).
		SetDestFolderRemoteID(opts.DestFolderRemoteID).
		SetOperation(string(entschema.TransferOperationSync)).
		SetConflictStrategy(string(opts.ConflictStrategy)).
		SetStatus(string(entschema.BatchStatusRunning)).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("transfer: create job: %w", err)
	}

	// Dispatch via River when available; fall back to goroutine for tests
	if e.Dispatcher != nil {
		if err := e.Dispatcher.InsertSyncJob(ctx, job.ID); err != nil {
			return nil, fmt.Errorf("transfer: enqueue job: %w", err)
		}
		return job, nil
	}
	go e.RunSync(context.Background(), job.ID)
	return job, nil
}

// RunSync executes the sync for an existing TransferJob record.
// Options are re-hydrated from the DB so the River worker only needs the jobID.
func (e *Engine) RunSync(ctx context.Context, jobID uuid.UUID) {
	job, err := e.DB.TransferJob.Get(ctx, jobID)
	if err != nil {
		slog.Error("transfer: load job", "job_id", jobID, "error", err)
		return
	}
	opts := SyncOptions{
		UserID:               job.UserID,
		SourceProviderID:     job.SourceProviderID,
		DestProviderID:       job.DestProviderID,
		SourceFolderRemoteID: job.SourceFolderRemoteID,
		DestFolderRemoteID:   job.DestFolderRemoteID,
		ConflictStrategy:     entschema.ConflictStrategy(job.ConflictStrategy),
	}
	e.runSync(ctx, jobID, opts)
}

// runSync executes the sync and updates the job record throughout.
func (e *Engine) runSync(ctx context.Context, jobID uuid.UUID, opts SyncOptions) {
	log := slog.With("job_id", jobID)

	src, err := loadProvider(ctx, e.DB, e.EncKey, opts.SourceProviderID)
	if err != nil {
		e.failJob(ctx, jobID, fmt.Sprintf("load source provider: %v", err))
		return
	}

	dst, err := loadProvider(ctx, e.DB, e.EncKey, opts.DestProviderID)
	if err != nil {
		e.failJob(ctx, jobID, fmt.Sprintf("load dest provider: %v", err))
		return
	}

	// List source folder
	sourceFiles, err := listAllFiles(ctx, src, opts.SourceFolderRemoteID)
	if err != nil {
		e.failJob(ctx, jobID, fmt.Sprintf("list source: %v", err))
		return
	}

	// Build dest index (name → remoteID) for conflict detection
	destIndex, err := buildDestIndex(ctx, dst, opts.DestFolderRemoteID)
	if err != nil {
		// Non-fatal: proceed without conflict detection
		log.Warn("could not list dest folder for conflict detection", "error", err)
		destIndex = map[string]string{}
	}

	// Update total counts
	totalBytes := int64(0)
	for _, f := range sourceFiles {
		if !f.IsDir {
			totalBytes += f.Size
		}
	}
	_, _ = e.DB.TransferJob.UpdateOneID(jobID).
		SetTotalFiles(countFiles(sourceFiles)).
		SetTotalBytes(totalBytes).
		Save(ctx)

	completed, failed := 0, 0
	transferred := int64(0)

	for _, fi := range sourceFiles {
		if fi.IsDir {
			continue // folders are created implicitly on upload
		}

		// Conflict check
		if destRemoteID, exists := destIndex[fi.Name]; exists {
			if opts.ConflictStrategy == entschema.ConflictStrategySkip {
				log.Debug("skipping existing file", "name", fi.Name)
				trackFile(ctx, e.DB, jobID, fi, destRemoteID, string(entschema.FileStatusCompleted), "skipped")
				completed++
				continue
			}
			// Overwrite: delete dest file first if provider supports it
			_ = dst.Delete(ctx, destRemoteID)
		}

		// Create job file record
		jf, _ := e.DB.TransferJobFile.Create().
			SetJobID(jobID).
			SetSourceRemoteID(fi.RemoteID).
			SetFileName(fi.Name).
			SetSize(fi.Size).
			SetStatus(string(entschema.FileStatusRunning)).
			Save(ctx)

		// Stream: download from source, upload to dest via io.Pipe
		destFI, err := streamCopy(ctx, src, dst, fi, opts.DestFolderRemoteID)
		if err != nil {
			failed++
			log.Warn("sync file failed", "name", fi.Name, "error", err)
			if jf != nil {
				_, _ = e.DB.TransferJobFile.UpdateOneID(jf.ID).
					SetStatus(string(entschema.FileStatusFailed)).
					SetErrorMessage(err.Error()).
					SetCompletedAt(time.Now()).
					Save(ctx)
			}
			continue
		}

		completed++
		transferred += fi.Size
		if jf != nil {
			_, _ = e.DB.TransferJobFile.UpdateOneID(jf.ID).
				SetDestRemoteID(destFI.RemoteID).
				SetTransferredBytes(fi.Size).
				SetStatus(string(entschema.FileStatusCompleted)).
				SetCompletedAt(time.Now()).
				Save(ctx)
		}

		// Update running counters on parent job
		_, _ = e.DB.TransferJob.UpdateOneID(jobID).
			SetCompletedFiles(completed).
			SetFailedFiles(failed).
			SetTransferredBytes(transferred).
			Save(ctx)
	}

	finalStatus := entschema.BatchStatusCompleted
	if failed > 0 && completed == 0 {
		finalStatus = entschema.BatchStatusFailed
	}
	now := time.Now()
	_, _ = e.DB.TransferJob.UpdateOneID(jobID).
		SetStatus(string(finalStatus)).
		SetCompletedFiles(completed).
		SetFailedFiles(failed).
		SetTransferredBytes(transferred).
		SetCompletedAt(now).
		Save(ctx)

	log.Info("sync completed",
		"completed", completed,
		"failed", failed,
		"transferred_bytes", transferred,
	)
}

// streamCopy downloads a file from src and uploads it to dst without buffering.
func streamCopy(ctx context.Context, src, dst storage.Provider, fi storage.FileInfo, destParentID string) (*storage.FileInfo, error) {
	pr, pw := io.Pipe()

	// Download in background goroutine
	var downloadErr error
	go func() {
		rc, _, err := src.Download(ctx, fi.RemoteID)
		if err != nil {
			downloadErr = err
			pw.CloseWithError(err)
			return
		}
		defer rc.Close()
		if _, err := io.Copy(pw, rc); err != nil {
			pw.CloseWithError(err)
			return
		}
		pw.Close()
	}()

	destFI, err := dst.Upload(ctx, storage.UploadParams{
		ParentID: destParentID,
		Name:     fi.Name,
		MimeType: fi.MimeType,
		Size:     fi.Size,
		Body:     pr,
	})
	pr.Close()

	if err != nil {
		return nil, fmt.Errorf("upload to dest: %w", err)
	}
	if downloadErr != nil {
		return nil, fmt.Errorf("download from source: %w", downloadErr)
	}
	return destFI, nil
}

// listAllFiles returns all non-recursive files in a folder.
// "." and "" both mean root.
func listAllFiles(ctx context.Context, p storage.Provider, folderRemoteID string) ([]storage.FileInfo, error) {
	if folderRemoteID == "." {
		folderRemoteID = ""
	}

	var all []storage.FileInfo
	pageToken := ""
	for {
		result, err := p.List(ctx, storage.ListOptions{
			ParentID:  folderRemoteID,
			PageToken: pageToken,
			PageSize:  100,
		})
		if err != nil {
			return nil, err
		}
		all = append(all, result.Files...)
		if result.NextPageToken == "" {
			break
		}
		pageToken = result.NextPageToken
	}
	return all, nil
}

// buildDestIndex maps filename → remoteID for files already in the dest folder.
func buildDestIndex(ctx context.Context, p storage.Provider, folderRemoteID string) (map[string]string, error) {
	if folderRemoteID == "." {
		folderRemoteID = ""
	}
	files, err := listAllFiles(ctx, p, folderRemoteID)
	if err != nil {
		return nil, err
	}
	index := make(map[string]string, len(files))
	for _, f := range files {
		if !f.IsDir {
			index[f.Name] = f.RemoteID
		}
	}
	return index, nil
}

func countFiles(files []storage.FileInfo) int {
	n := 0
	for _, f := range files {
		if !f.IsDir {
			n++
		}
	}
	return n
}

func trackFile(ctx context.Context, db *ent.Client, jobID uuid.UUID, fi storage.FileInfo, destRemoteID, status, errMsg string) {
	q := db.TransferJobFile.Create().
		SetJobID(jobID).
		SetSourceRemoteID(fi.RemoteID).
		SetFileName(fi.Name).
		SetSize(fi.Size).
		SetStatus(status)
	if destRemoteID != "" {
		q = q.SetDestRemoteID(destRemoteID)
	}
	if errMsg != "" {
		q = q.SetErrorMessage(errMsg)
	}
	_, _ = q.SetCompletedAt(time.Now()).Save(ctx)
}

func (e *Engine) failJob(ctx context.Context, jobID uuid.UUID, msg string) {
	slog.Error("transfer job failed", "job_id", jobID, "error", msg)
	_, _ = e.DB.TransferJob.UpdateOneID(jobID).
		SetStatus(string(entschema.BatchStatusFailed)).
		SetErrorMessage(msg).
		SetCompletedAt(time.Now()).
		Save(ctx)
}
