package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/drivebase/drivebase/internal/auth"
	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/ent"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/google/uuid"
)

const maxUploadMemory = 32 << 20 // 32 MB

// fileHandler holds shared dependencies for REST file endpoints.
type fileHandler struct {
	cfg *config.Config
	db  *ent.Client
}

func (h *fileHandler) upload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if u, _ := auth.UserFromCtx(ctx); u == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := r.ParseMultipartForm(maxUploadMemory); err != nil {
		http.Error(w, "failed to parse multipart form", http.StatusBadRequest)
		return
	}
	defer r.MultipartForm.RemoveAll()

	// Accept provider_id from form field or query param
	providerIDStr := r.FormValue("provider_id")
	if providerIDStr == "" {
		providerIDStr = r.URL.Query().Get("provider_id")
	}
	if providerIDStr == "" {
		http.Error(w, "provider_id required", http.StatusBadRequest)
		return
	}
	providerID, err := uuid.Parse(providerIDStr)
	if err != nil {
		http.Error(w, "invalid provider_id", http.StatusBadRequest)
		return
	}

	parentRemoteID := r.FormValue("parent_remote_id")
	if parentRemoteID == "" {
		parentRemoteID = r.URL.Query().Get("parent_remote_id")
	}

	// Accept files under either "files" or "file" field name
	files := r.MultipartForm.File["files"]
	if len(files) == 0 {
		files = r.MultipartForm.File["file"]
	}
	if len(files) == 0 {
		http.Error(w, "no files provided (use field name 'file' or 'files')", http.StatusBadRequest)
		return
	}

	prov, err := h.db.Provider.Get(ctx, providerID)
	if err != nil {
		http.Error(w, "provider not found", http.StatusNotFound)
		return
	}

	if err := auth.Check(ctx, h.db, string(entschema.ResourceTypeWorkspace), prov.WorkspaceID, string(entschema.ActionWrite)); err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	sp, err := loadStorageProvider(ctx, h.db, h.cfg.Crypto.EncryptionKey, providerID)
	if err != nil {
		http.Error(w, "failed to load provider", http.StatusInternalServerError)
		return
	}

	totalSize := int64(0)
	for _, fh := range files {
		totalSize += fh.Size
	}

	batch, err := h.db.UploadBatch.Create().
		SetWorkspaceID(prov.WorkspaceID).
		SetProviderID(providerID).
		SetParentRemoteID(parentRemoteID).
		SetStatus(string(entschema.BatchStatusRunning)).
		SetTotalFiles(len(files)).
		SetTotalBytes(totalSize).
		Save(ctx)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	completedFiles := 0
	failedFiles := 0
	transferredBytes := int64(0)

	type fileResult struct {
		Name     string `json:"name"`
		RemoteID string `json:"remote_id,omitempty"`
		Error    string `json:"error,omitempty"`
	}
	results := make([]fileResult, 0, len(files))

	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			failedFiles++
			results = append(results, fileResult{Name: fh.Filename, Error: "failed to open file"})
			_, _ = h.db.UploadBatchFile.Create().
				SetBatchID(batch.ID).
				SetFileName(fh.Filename).
				SetSize(fh.Size).
				SetStatus(string(entschema.FileStatusFailed)).
				SetErrorMessage("failed to open file").
				Save(ctx)
			continue
		}

		fi, uploadErr := sp.Upload(ctx, storage.UploadParams{
			ParentID: parentRemoteID,
			Name:     fh.Filename,
			MimeType: fh.Header.Get("Content-Type"),
			Size:     fh.Size,
			Body:     f,
		})
		f.Close()

		if uploadErr != nil {
			failedFiles++
			results = append(results, fileResult{Name: fh.Filename, Error: fmt.Sprintf("upload failed: %v", uploadErr)})
			_, _ = h.db.UploadBatchFile.Create().
				SetBatchID(batch.ID).
				SetFileName(fh.Filename).
				SetMimeType(fh.Header.Get("Content-Type")).
				SetSize(fh.Size).
				SetStatus(string(entschema.FileStatusFailed)).
				SetErrorMessage(uploadErr.Error()).
				Save(ctx)
			continue
		}

		completedFiles++
		transferredBytes += fh.Size
		results = append(results, fileResult{Name: fi.Name, RemoteID: fi.RemoteID})

		q := h.db.FileNode.Create().
			SetProviderID(providerID).
			SetRemoteID(fi.RemoteID).
			SetName(fi.Name).
			SetIsDir(false).
			SetSize(fi.Size).
			SetMimeType(fi.MimeType)
		if !fi.ModifiedAt.IsZero() {
			q = q.SetRemoteModifiedAt(fi.ModifiedAt)
		}
		_, _ = q.Save(ctx)

		_, _ = h.db.UploadBatchFile.Create().
			SetBatchID(batch.ID).
			SetFileName(fi.Name).
			SetMimeType(fi.MimeType).
			SetSize(fh.Size).
			SetTransferredBytes(fh.Size).
			SetStatus(string(entschema.FileStatusCompleted)).
			SetRemoteID(fi.RemoteID).
			Save(ctx)
	}

	finalStatus := entschema.BatchStatusCompleted
	if failedFiles > 0 && completedFiles == 0 {
		finalStatus = entschema.BatchStatusFailed
	}
	now := time.Now()
	_, _ = h.db.UploadBatch.UpdateOneID(batch.ID).
		SetStatus(string(finalStatus)).
		SetCompletedFiles(completedFiles).
		SetFailedFiles(failedFiles).
		SetTransferredBytes(transferredBytes).
		SetCompletedAt(now).
		Save(ctx)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"batch_id":          batch.ID,
		"status":            string(finalStatus),
		"total_files":       len(files),
		"completed_files":   completedFiles,
		"failed_files":      failedFiles,
		"transferred_bytes": transferredBytes,
		"files":             results,
	})
}
