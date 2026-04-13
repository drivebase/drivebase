package server

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/drivebase/drivebase/internal/templink"
)

// tempLinkHandler streams a file when the HMAC signature and expiry are valid.
// No session/JWT required — the HMAC signature is the auth.
func (h *fileHandler) tempLink(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	fileNodeIDStr := chi.URLParam(r, "fileNodeID")
	fileNodeID, err := uuid.Parse(fileNodeIDStr)
	if err != nil {
		http.Error(w, "invalid fileNodeID", http.StatusBadRequest)
		return
	}

	exp := r.URL.Query().Get("exp")
	sig := r.URL.Query().Get("sig")
	if exp == "" || sig == "" {
		http.Error(w, "missing exp or sig", http.StatusBadRequest)
		return
	}

	if !templink.Verify(fileNodeIDStr, exp, sig, h.cfg.Auth.JWTSecret) {
		// Distinguish expired from bad signature
		expUnix, _ := strconv.ParseInt(exp, 10, 64)
		if expUnix > 0 {
			http.Error(w, "link expired or invalid", http.StatusGone)
		} else {
			http.Error(w, "invalid signature", http.StatusForbidden)
		}
		return
	}

	fn, err := h.db.FileNode.Get(ctx, fileNodeID)
	if err != nil {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	sp, err := loadStorageProvider(ctx, h.db, h.cfg.Crypto.EncryptionKey, fn.ProviderID)
	if err != nil {
		http.Error(w, "failed to load provider", http.StatusInternalServerError)
		return
	}

	rc, fi, err := sp.Download(ctx, fn.RemoteID)
	if err != nil {
		http.Error(w, "download failed", http.StatusInternalServerError)
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
