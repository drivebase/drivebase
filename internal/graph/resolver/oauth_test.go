package resolver

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/drivebase/drivebase/internal/auth"
	"github.com/drivebase/drivebase/internal/crypto"
	"github.com/drivebase/drivebase/internal/ent"
	entoauthapp "github.com/drivebase/drivebase/internal/ent/oauthapp"
	"github.com/drivebase/drivebase/internal/graph"
	"github.com/drivebase/drivebase/internal/storage"
)

// oauthConfigForType is tested via storage.BuildOAuthConfig in internal/storage tests.

// ─── mapOAuthApp ─────────────────────────────────────────────────────────────

func TestMapOAuthApp_withAlias(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	app := &ent.OAuthApp{
		ProviderType:          string(storage.ProviderTypeGoogleDrive),
		ClientID:              "my-client-id",
		EncryptedClientSecret: []byte("enc"),
		Alias:                 "My App",
		CreatedAt:             now,
	}
	out := mapOAuthApp(app)
	require.NotNil(t, out)
	assert.Equal(t, graph.ProviderType(storage.ProviderTypeGoogleDrive), out.ProviderType)
	assert.Equal(t, "my-client-id", out.ClientID)
	require.NotNil(t, out.Alias)
	assert.Equal(t, "My App", *out.Alias)
	assert.Equal(t, now, out.CreatedAt)
}

func TestMapOAuthApp_withoutAlias(t *testing.T) {
	app := &ent.OAuthApp{
		ProviderType:          string(storage.ProviderTypeGoogleDrive),
		ClientID:              "cid",
		EncryptedClientSecret: []byte("enc"),
		CreatedAt:             time.Now(),
	}
	out := mapOAuthApp(app)
	assert.Nil(t, out.Alias)
}

// ─── Integration tests (require Postgres) ────────────────────────────────────

const testEncryptionKey = "test-encryption-key-32-chars-xxx"

// setupOAuthTest creates a fresh user in the shared DB and returns
// ready-to-use resolvers + a user-scoped auth context.
// No container is started — TestMain starts one for the whole package.
func setupOAuthTest(t *testing.T) (*mutationResolver, *queryResolver, context.Context) {
	t.Helper()
	ctx := context.Background()

	hashedPw, err := auth.HashPassword("password")
	require.NoError(t, err)
	user, err := sharedDB.User.Create().
		SetEmail(t.Name()+"@example.com").
		SetName("Test User").
		SetPasswordHash(hashedPw).
		Save(ctx)
	require.NoError(t, err)

	authCtx := auth.WithUser(ctx, user)

	r := &Resolver{DB: sharedDB, Config: sharedCfg}
	return &mutationResolver{r}, &queryResolver{r}, authCtx
}

// ─── SaveOAuthApp ─────────────────────────────────────────────────────────────

func TestSaveOAuthApp_create(t *testing.T) {
	mut, qry, ctx := setupOAuthTest(t)

	app, err := mut.SaveOAuthApp(ctx, graph.SaveOAuthAppInput{
		ProviderType: graph.ProviderType(storage.ProviderTypeGoogleDrive),
		ClientID:     "client-123",
		ClientSecret: "secret-abc",
	})
	require.NoError(t, err)
	require.NotNil(t, app)
	assert.Equal(t, graph.ProviderType(storage.ProviderTypeGoogleDrive), app.ProviderType)
	assert.Equal(t, "client-123", app.ClientID)
	assert.Nil(t, app.Alias)

	// Confirm query returns it
	got, err := qry.OauthApp(ctx, graph.ProviderType(storage.ProviderTypeGoogleDrive))
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "client-123", got.ClientID)

	// Verify client_secret is stored encrypted
	u, _ := auth.UserFromCtx(ctx)
	dbApp, err := mut.DB.OAuthApp.Query().
		Where(entoauthapp.UserID(u.ID)).
		Only(ctx)
	require.NoError(t, err)
	decrypted, err := crypto.Decrypt(dbApp.EncryptedClientSecret, testEncryptionKey)
	require.NoError(t, err)
	assert.Equal(t, "secret-abc", string(decrypted))
}

func TestSaveOAuthApp_upsert(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	_, err := mut.SaveOAuthApp(ctx, graph.SaveOAuthAppInput{
		ProviderType: graph.ProviderType(storage.ProviderTypeGoogleDrive),
		ClientID:     "old-client",
		ClientSecret: "old-secret",
	})
	require.NoError(t, err)

	alias := "My GDrive App"
	updated, err := mut.SaveOAuthApp(ctx, graph.SaveOAuthAppInput{
		ProviderType: graph.ProviderType(storage.ProviderTypeGoogleDrive),
		ClientID:     "new-client",
		ClientSecret: "new-secret",
		Alias:        &alias,
	})
	require.NoError(t, err)
	assert.Equal(t, "new-client", updated.ClientID)
	require.NotNil(t, updated.Alias)
	assert.Equal(t, alias, *updated.Alias)
}

func TestSaveOAuthApp_withAlias(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	alias := "Production GDrive"
	app, err := mut.SaveOAuthApp(ctx, graph.SaveOAuthAppInput{
		ProviderType: graph.ProviderType(storage.ProviderTypeGoogleDrive),
		ClientID:     "cid",
		ClientSecret: "cs",
		Alias:        &alias,
	})
	require.NoError(t, err)
	require.NotNil(t, app.Alias)
	assert.Equal(t, alias, *app.Alias)
}

// ─── DeleteOAuthApp ───────────────────────────────────────────────────────────

func TestDeleteOAuthApp(t *testing.T) {
	mut, qry, ctx := setupOAuthTest(t)

	_, err := mut.SaveOAuthApp(ctx, graph.SaveOAuthAppInput{
		ProviderType: graph.ProviderType(storage.ProviderTypeGoogleDrive),
		ClientID:     "cid",
		ClientSecret: "cs",
	})
	require.NoError(t, err)

	ok, err := mut.DeleteOAuthApp(ctx, graph.ProviderType(storage.ProviderTypeGoogleDrive))
	require.NoError(t, err)
	assert.True(t, ok)

	got, err := qry.OauthApp(ctx, graph.ProviderType(storage.ProviderTypeGoogleDrive))
	require.NoError(t, err)
	assert.Nil(t, got)
}

// ─── OauthApps ────────────────────────────────────────────────────────────────

func TestOauthApps_empty(t *testing.T) {
	_, qry, ctx := setupOAuthTest(t)

	apps, err := qry.OauthApps(ctx)
	require.NoError(t, err)
	assert.Empty(t, apps)
}

func TestOauthApps_listed(t *testing.T) {
	mut, qry, ctx := setupOAuthTest(t)

	_, err := mut.SaveOAuthApp(ctx, graph.SaveOAuthAppInput{
		ProviderType: graph.ProviderType(storage.ProviderTypeGoogleDrive),
		ClientID:     "cid",
		ClientSecret: "cs",
	})
	require.NoError(t, err)

	apps, err := qry.OauthApps(ctx)
	require.NoError(t, err)
	require.Len(t, apps, 1)
	assert.Equal(t, "cid", apps[0].ClientID)
}

// ─── InitiateOAuth ────────────────────────────────────────────────────────────

func TestInitiateOAuth_returnsAuthURL(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	app, err := mut.SaveOAuthApp(ctx, graph.SaveOAuthAppInput{
		ProviderType: graph.ProviderType(storage.ProviderTypeGoogleDrive),
		ClientID:     "my-client-id",
		ClientSecret: "my-client-secret",
	})
	require.NoError(t, err)

	authURL, err := mut.InitiateOAuth(ctx, app.ID, "My Drive")
	require.NoError(t, err)
	assert.True(t, strings.HasPrefix(authURL, "https://accounts.google.com/o/oauth2/auth"),
		"expected Google OAuth URL, got: %s", authURL)
	assert.Contains(t, authURL, "my-client-id")
	assert.Contains(t, authURL, "state=")
}

func TestInitiateOAuth_missingApp(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	_, err := mut.InitiateOAuth(ctx, uuid.New(), "My Drive")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "OAuth app not found")
}
