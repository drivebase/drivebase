package server

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/drivebase/drivebase/internal/auth"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	"github.com/drivebase/drivebase/internal/sharing"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func (h *fileHandler) download(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	fileNodeIDStr := chi.URLParam(r, "fileNodeID")
	fileNodeID, err := uuid.Parse(fileNodeIDStr)
	if err != nil {
		http.Error(w, "invalid fileNodeID", http.StatusBadRequest)
		return
	}

	fn, err := h.db.FileNode.Get(ctx, fileNodeID)
	if err != nil {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	// Auth: authenticated user OR valid share token that covers this file
	authed := false
	if u, _ := auth.UserFromCtx(ctx); u != nil {
		prov, err := h.db.Provider.Get(ctx, fn.ProviderID)
		if err != nil {
			http.Error(w, "provider not found", http.StatusNotFound)
			return
		}
		if err := auth.Check(ctx, h.db, string(entschema.ResourceTypeWorkspace), prov.WorkspaceID, string(entschema.ActionRead)); err != nil {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		authed = true
	}

	if !authed {
		link := sharing.SharedLinkFromCtx(ctx)
		if link == nil || !sharing.IsFileAccessible(link, fn.ID, fn.ParentID) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	sp, err := loadStorageProvider(ctx, h.db, h.cfg.Crypto.EncryptionKey, fn.ProviderID)
	if err != nil {
		http.Error(w, "failed to load provider", http.StatusInternalServerError)
		return
	}

	rc, fi, err := sp.Download(ctx, fn.RemoteID)
	if err != nil {
		http.Error(w, fmt.Sprintf("download failed: %v", err), http.StatusInternalServerError)
		return
	}
	defer rc.Close()

	if fi.MimeType != "" {
		w.Header().Set("Content-Type", fi.MimeType)
	} else {
		w.Header().Set("Content-Type", "application/octet-stream")
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fi.Name))
	if fi.Size > 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(fi.Size, 10))
	}

	w.WriteHeader(http.StatusOK)
	io.Copy(w, rc)
}
