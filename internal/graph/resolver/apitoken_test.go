package resolver

import (
	"testing"
	"time"

	"github.com/drivebase/drivebase/internal/apitoken"
	"github.com/drivebase/drivebase/internal/graph"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─── mapAPIToken ──────────────────────────────────────────────────────────────

func TestMapAPIToken_basic(t *testing.T) {
	tok := makeEntAPIToken()
	out := mapAPIToken(tok)
	require.NotNil(t, out)
	assert.Equal(t, tok.ID, out.ID)
	assert.Equal(t, tok.Name, out.Name)
	assert.Equal(t, tok.DisplayToken, out.DisplayToken)
	assert.Equal(t, tok.Scopes, out.Scopes)
	assert.Nil(t, out.ProviderScopes)
	assert.Nil(t, out.ExpiresAt)
	assert.Nil(t, out.LastUsedAt)
}

func TestMapAPIToken_withProviderScopes(t *testing.T) {
	tok := makeEntAPIToken()
	pid := uuid.New()
	fid := uuid.New()
	tok.ProviderScopes = []apitoken.ProviderScope{
		{ProviderID: pid, FolderIDs: []uuid.UUID{fid}},
	}
	out := mapAPIToken(tok)
	require.Len(t, out.ProviderScopes, 1)
	assert.Equal(t, pid, out.ProviderScopes[0].ProviderID)
	assert.Equal(t, []uuid.UUID{fid}, out.ProviderScopes[0].FolderIDs)
}

func TestMapAPIToken_withExpiry(t *testing.T) {
	tok := makeEntAPIToken()
	exp := time.Now().Add(24 * time.Hour)
	tok.ExpiresAt = &exp
	out := mapAPIToken(tok)
	require.NotNil(t, out.ExpiresAt)
	assert.Equal(t, exp, *out.ExpiresAt)
}

// ─── Integration: CreateAPIToken / RevokeAPIToken / APITokens ─────────────────

func TestCreateAPIToken_basic(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t) // reuse postgres setup helper

	payload, err := mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:   "CI Key",
		Scopes: []string{apitoken.ScopeFilesRead, apitoken.ScopeFilesWrite},
	})
	require.NoError(t, err)
	require.NotNil(t, payload)
	assert.NotEmpty(t, payload.RawToken)
	assert.True(t, apitoken.IsAPIToken(payload.RawToken))
	assert.Equal(t, "CI Key", payload.Token.Name)
	assert.Contains(t, payload.Token.DisplayToken, "...")
	assert.Nil(t, payload.Token.ProviderScopes)
}

func TestCreateAPIToken_withProviderScopes(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	pid := uuid.New()
	fid := uuid.New()
	payload, err := mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:   "Scoped Key",
		Scopes: []string{apitoken.ScopeFilesRead},
		ProviderScopes: []*graph.APITokenProviderScopeInput{
			{ProviderID: pid, FolderIDs: []uuid.UUID{fid}},
		},
	})
	require.NoError(t, err)
	require.Len(t, payload.Token.ProviderScopes, 1)
	assert.Equal(t, pid, payload.Token.ProviderScopes[0].ProviderID)
	assert.Equal(t, []uuid.UUID{fid}, payload.Token.ProviderScopes[0].FolderIDs)
}

func TestCreateAPIToken_withExpiry(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	exp := time.Now().Add(30 * 24 * time.Hour)
	payload, err := mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:      "Expiring Key",
		Scopes:    []string{apitoken.ScopeAdmin},
		ExpiresAt: &exp,
	})
	require.NoError(t, err)
	require.NotNil(t, payload.Token.ExpiresAt)
}

func TestCreateAPIToken_emptyScopes(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	_, err := mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:   "Bad Key",
		Scopes: []string{},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "at least one scope")
}

func TestCreateAPIToken_invalidScope(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	_, err := mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:   "Bad Key",
		Scopes: []string{"not:a:real:scope"},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid scope")
}

func TestAPITokens_list(t *testing.T) {
	mut, qry, ctx := setupOAuthTest(t)

	_, err := mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:   "Key 1",
		Scopes: []string{apitoken.ScopeFilesRead},
	})
	require.NoError(t, err)

	_, err = mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:   "Key 2",
		Scopes: []string{apitoken.ScopeAdmin},
	})
	require.NoError(t, err)

	tokens, err := qry.APITokens(ctx)
	require.NoError(t, err)
	assert.Len(t, tokens, 2)
	// Raw token is never in the list
	for _, tok := range tokens {
		assert.NotEmpty(t, tok.DisplayToken)
		assert.Contains(t, tok.DisplayToken, "...")
	}
}

func TestRevokeAPIToken(t *testing.T) {
	mut, qry, ctx := setupOAuthTest(t)

	payload, err := mut.CreateAPIToken(ctx, graph.CreateAPITokenInput{
		Name:   "Temp Key",
		Scopes: []string{apitoken.ScopeFilesRead},
	})
	require.NoError(t, err)

	ok, err := mut.RevokeAPIToken(ctx, payload.Token.ID)
	require.NoError(t, err)
	assert.True(t, ok)

	tokens, err := qry.APITokens(ctx)
	require.NoError(t, err)
	assert.Empty(t, tokens)
}

func TestRevokeAPIToken_notFound(t *testing.T) {
	mut, _, ctx := setupOAuthTest(t)

	_, err := mut.RevokeAPIToken(ctx, uuid.New())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}
