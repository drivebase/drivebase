package server

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/drivebase/drivebase/internal/config"
	"github.com/drivebase/drivebase/internal/crypto"
	"github.com/drivebase/drivebase/internal/ent"
	entoauthapp "github.com/drivebase/drivebase/internal/ent/oauthapp"
	entoauthstate "github.com/drivebase/drivebase/internal/ent/oauthstate"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/drivebase/drivebase/internal/storage/googledrive"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
)

type oauthHandler struct {
	cfg *config.Config
	db  *ent.Client
}

// callback handles the redirect from Google after the user grants access.
// GET /api/v1/oauth/callback?code=...&state=...
func (h *oauthHandler) callback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	code := r.URL.Query().Get("code")
	stateStr := r.URL.Query().Get("state")
	if code == "" || stateStr == "" {
		http.Error(w, "missing code or state", http.StatusBadRequest)
		return
	}

	stateID, err := uuid.Parse(stateStr)
	if err != nil {
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}

	state, err := h.db.OAuthState.Query().
		Where(entoauthstate.ID(stateID)).
		Only(ctx)
	if err != nil {
		http.Error(w, "unknown or expired state", http.StatusBadRequest)
		return
	}

	if time.Now().After(state.ExpiresAt) {
		_ = h.db.OAuthState.DeleteOneID(stateID).Exec(ctx)
		http.Error(w, "OAuth state expired — please try again", http.StatusBadRequest)
		return
	}

	app, err := h.db.OAuthApp.Query().
		Where(entoauthapp.ID(state.OauthAppID)).
		Only(ctx)
	if err != nil {
		http.Error(w, "OAuth app not found", http.StatusBadRequest)
		return
	}

	clientSecret, err := crypto.Decrypt(app.EncryptedClientSecret, h.cfg.Crypto.EncryptionKey)
	if err != nil {
		slog.Error("oauth callback: decrypt client secret", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	provType := storage.ProviderType(state.ProviderType)
	oauthCfg := storage.BuildOAuthConfig(provType, app.ClientID, string(clientSecret), h.cfg.Server.OAuthCallbackURL)
	if oauthCfg == nil {
		http.Error(w, fmt.Sprintf("unsupported OAuth provider: %s", provType), http.StatusBadRequest)
		return
	}

	token, err := oauthCfg.Exchange(ctx, code)
	if err != nil {
		slog.Error("oauth callback: token exchange", "error", err)
		http.Error(w, "token exchange failed", http.StatusBadRequest)
		return
	}

	creds := buildProviderCredentials(provType, app.ClientID, string(clientSecret), token)
	if creds == nil {
		http.Error(w, "unsupported provider type", http.StatusBadRequest)
		return
	}
	credsJSON, err := json.Marshal(creds)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	encrypted, err := crypto.Encrypt(credsJSON, h.cfg.Crypto.EncryptionKey)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// Create provider + credential + cache config in one transaction
	tx, err := h.db.Tx(ctx)
	if err != nil {
		slog.Error("oauth callback: begin tx", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	p, err := tx.Provider.Create().
		SetWorkspaceID(state.WorkspaceID).
		SetType(string(provType)).
		SetName(state.ProviderName).
		SetAuthType(string(entschema.AuthTypeOAuth)).
		Save(ctx)
	if err != nil {
		_ = tx.Rollback()
		slog.Error("oauth callback: create provider", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if _, err = tx.ProviderCredential.Create().
		SetProviderID(p.ID).
		SetEncryptedData(encrypted).
		Save(ctx); err != nil {
		_ = tx.Rollback()
		slog.Error("oauth callback: create credential", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if _, err = tx.CacheConfig.Create().
		SetProviderID(p.ID).
		SetEnabled(true).
		SetTTLSeconds(300).
		Save(ctx); err != nil {
		_ = tx.Rollback()
		slog.Error("oauth callback: create cache config", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if err = tx.Commit(); err != nil {
		slog.Error("oauth callback: commit", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	_ = h.db.OAuthState.DeleteOneID(stateID).Exec(ctx)

	slog.Info("oauth provider connected",
		"workspace_id", state.WorkspaceID,
		"provider_type", state.ProviderType,
		"provider_name", state.ProviderName,
	)

	frontendURL := h.cfg.Server.FrontendURL
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	http.Redirect(w, r, frontendURL+"/providers", http.StatusFound)
}

func buildProviderCredentials(provType storage.ProviderType, clientID, clientSecret string, token *oauth2.Token) any {
	switch provType {
	case storage.ProviderTypeGoogleDrive:
		return googledrive.Credentials{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			AccessToken:  token.AccessToken,
			RefreshToken: token.RefreshToken,
			Expiry:       token.Expiry,
		}
	default:
		return nil
	}
}
