package apitoken

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─── Generate ────────────────────────────────────────────────────────────────

func TestGenerate_format(t *testing.T) {
	token, hash, display, err := Generate()
	require.NoError(t, err)

	assert.True(t, strings.HasPrefix(token, "drv_"), "token should start with drv_")
	assert.NotEmpty(t, hash)
	assert.Len(t, hash, 64, "SHA-256 hex = 64 chars")
	assert.True(t, strings.HasPrefix(display, "drv_"), "display should start with drv_")
	assert.Contains(t, display, "...", "display should be truncated")
}

func TestGenerate_unique(t *testing.T) {
	t1, _, _, _ := Generate()
	t2, _, _, _ := Generate()
	assert.NotEqual(t, t1, t2)
}

func TestGenerate_hashMatchesToken(t *testing.T) {
	token, hash, _, err := Generate()
	require.NoError(t, err)
	assert.Equal(t, Hash(token), hash)
}

// ─── makeDisplayToken ─────────────────────────────────────────────────────────

func TestMakeDisplayToken(t *testing.T) {
	token := "drv_abc123456789XYZWVU"
	display := makeDisplayToken(token)
	assert.True(t, strings.HasPrefix(display, "drv_abc1"), "should keep first 12 chars")
	assert.True(t, strings.HasSuffix(display, token[len(token)-4:]), "should keep last 4 chars")
	assert.Contains(t, display, "...")
}

func TestMakeDisplayToken_short(t *testing.T) {
	token := "drv_short"
	display := makeDisplayToken(token)
	assert.Equal(t, token, display, "short tokens should not be truncated")
}

// ─── IsAPIToken ───────────────────────────────────────────────────────────────

func TestIsAPIToken(t *testing.T) {
	assert.True(t, IsAPIToken("drv_abc123"))
	assert.False(t, IsAPIToken("eyJhbGciOiJIUzI1NiJ9.xxx")) // JWT
	assert.False(t, IsAPIToken(""))
	assert.False(t, IsAPIToken("sk_live_abc"))
}

// ─── ValidateScope ────────────────────────────────────────────────────────────

func TestValidateScope(t *testing.T) {
	assert.True(t, ValidateScope(ScopeFilesRead))
	assert.True(t, ValidateScope(ScopeAdmin))
	assert.False(t, ValidateScope("files:delete"))
	assert.False(t, ValidateScope(""))
}

// ─── HasScope ─────────────────────────────────────────────────────────────────

func TestHasScope_exact(t *testing.T) {
	scopes := []string{ScopeFilesRead, ScopeProvidersRead}
	assert.True(t, HasScope(scopes, ScopeFilesRead))
	assert.True(t, HasScope(scopes, ScopeProvidersRead))
	assert.False(t, HasScope(scopes, ScopeFilesWrite))
}

func TestHasScope_adminGrantsAll(t *testing.T) {
	scopes := []string{ScopeAdmin}
	assert.True(t, HasScope(scopes, ScopeFilesRead))
	assert.True(t, HasScope(scopes, ScopeFilesWrite))
	assert.True(t, HasScope(scopes, ScopeProvidersWrite))
}

func TestHasScope_empty(t *testing.T) {
	assert.False(t, HasScope(nil, ScopeFilesRead))
	assert.False(t, HasScope([]string{}, ScopeFilesRead))
}
