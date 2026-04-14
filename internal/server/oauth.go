package server

import (
	"context"
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
	"golang.org/x/oauth2/google"
	googledrivescope "google.golang.org/api/drive/v3"
)

type oauthHandler struct {
	cfg *config.Config
	db  *ent.Client
}

// oauthCallback handles the redirect from Google after the user grants access.
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

	// Look up state record
	state, err := h.db.OAuthState.Query().
		Where(entoauthstate.ID(stateID)).
		Only(ctx)
	if err != nil {
		http.Error(w, "unknown or expired state", http.StatusBadRequest)
		return
	}

	// Check expiry
	if time.Now().After(state.ExpiresAt) {
		_ = h.db.OAuthState.DeleteOneID(stateID).Exec(ctx)
		http.Error(w, "OAuth state expired — please try again", http.StatusBadRequest)
		return
	}

	// Load the OAuth app credentials
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
	oauthCfg := buildOAuthConfig(provType, app.ClientID, string(clientSecret), h.cfg.Server.OAuthCallbackURL)
	if oauthCfg == nil {
		http.Error(w, fmt.Sprintf("unsupported OAuth provider: %s", provType), http.StatusBadRequest)
		return
	}

	// Exchange authorization code for tokens (server-to-server, never exposed to client)
	token, err := oauthCfg.Exchange(ctx, code)
	if err != nil {
		slog.Error("oauth callback: token exchange", "error", err)
		http.Error(w, "token exchange failed", http.StatusBadRequest)
		return
	}

	// Build and encrypt credentials
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
	if err := withTx(ctx, h.db, func(tx *ent.Tx) error {
		p, err := tx.Provider.Create().
			SetWorkspaceID(state.WorkspaceID).
			SetType(string(provType)).
			SetName(state.ProviderName).
			SetAuthType(string(entschema.AuthTypeOAuth)).
			Save(ctx)
		if err != nil {
			return err
		}
		_, err = tx.ProviderCredential.Create().
			SetProviderID(p.ID).
			SetEncryptedData(encrypted).
			Save(ctx)
		if err != nil {
			return err
		}
		_, err = tx.CacheConfig.Create().
			SetProviderID(p.ID).
			SetEnabled(true).
			SetTTLSeconds(300).
			Save(ctx)
		return err
	}); err != nil {
		slog.Error("oauth callback: create provider", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// Clean up state
	_ = h.db.OAuthState.DeleteOneID(stateID).Exec(ctx)

	slog.Info("oauth provider connected",
		"workspace_id", state.WorkspaceID,
		"provider_type", state.ProviderType,
		"provider_name", state.ProviderName,
	)

	http.Redirect(w, r, "/?oauth=success", http.StatusFound)
}

func buildOAuthConfig(provType storage.ProviderType, clientID, clientSecret, callbackURL string) *oauth2.Config {
	switch provType {
	case storage.ProviderTypeGoogleDrive:
		return &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  callbackURL,
			Endpoint:     google.Endpoint,
			Scopes:       []string{googledrivescope.DriveScope},
		}
	default:
		return nil
	}
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

// withTx runs fn inside a database transaction, rolling back on error or panic.
func withTx(ctx context.Context, client *ent.Client, fn func(tx *ent.Tx) error) error {
	tx, err := client.Tx(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if v := recover(); v != nil {
			_ = tx.Rollback()
			panic(v)
		}
	}()
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
