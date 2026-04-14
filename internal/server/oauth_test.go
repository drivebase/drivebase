package server

import (
	"testing"
	"time"

	"github.com/drivebase/drivebase/internal/storage"
	"github.com/drivebase/drivebase/internal/storage/googledrive"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googledrivescope "google.golang.org/api/drive/v3"
)

// ─── buildOAuthConfig ────────────────────────────────────────────────────────

func TestBuildOAuthConfig_googleDrive(t *testing.T) {
	cfg := buildOAuthConfig(storage.ProviderTypeGoogleDrive, "client-id", "client-secret", "http://localhost/callback")
	require.NotNil(t, cfg)
	assert.Equal(t, "client-id", cfg.ClientID)
	assert.Equal(t, "client-secret", cfg.ClientSecret)
	assert.Equal(t, "http://localhost/callback", cfg.RedirectURL)
	assert.Equal(t, google.Endpoint, cfg.Endpoint)
	assert.Contains(t, cfg.Scopes, googledrivescope.DriveScope)
}

func TestBuildOAuthConfig_unsupportedProvider(t *testing.T) {
	cfg := buildOAuthConfig(storage.ProviderType("unknown"), "cid", "cs", "http://cb")
	assert.Nil(t, cfg)
}

// ─── buildProviderCredentials ────────────────────────────────────────────────

func TestBuildProviderCredentials_googleDrive(t *testing.T) {
	token := &oauth2.Token{
		AccessToken:  "access-tok",
		RefreshToken: "refresh-tok",
		Expiry:       time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}
	creds := buildProviderCredentials(storage.ProviderTypeGoogleDrive, "cid", "cs", token)
	require.NotNil(t, creds)

	gd, ok := creds.(googledrive.Credentials)
	require.True(t, ok, "expected googledrive.Credentials")
	assert.Equal(t, "cid", gd.ClientID)
	assert.Equal(t, "cs", gd.ClientSecret)
	assert.Equal(t, "access-tok", gd.AccessToken)
	assert.Equal(t, "refresh-tok", gd.RefreshToken)
	assert.Equal(t, token.Expiry, gd.Expiry)
}

func TestBuildProviderCredentials_unsupportedProvider(t *testing.T) {
	token := &oauth2.Token{AccessToken: "tok"}
	creds := buildProviderCredentials(storage.ProviderType("unknown"), "cid", "cs", token)
	assert.Nil(t, creds)
}
