package apitoken

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

var (
	provA  = uuid.New()
	provB  = uuid.New()
	folder1 = uuid.New()
	folder2 = uuid.New()
)

// ─── AllowsProvider ───────────────────────────────────────────────────────────

func TestAllowsProvider_nilScopes(t *testing.T) {
	assert.True(t, AllowsProvider(nil, provA), "nil = unrestricted")
}

func TestAllowsProvider_emptyScopes(t *testing.T) {
	assert.True(t, AllowsProvider([]ProviderScope{}, provA), "empty = unrestricted")
}

func TestAllowsProvider_allowed(t *testing.T) {
	scopes := []ProviderScope{{ProviderID: provA}}
	assert.True(t, AllowsProvider(scopes, provA))
	assert.False(t, AllowsProvider(scopes, provB))
}

// ─── AllowsFolder ─────────────────────────────────────────────────────────────

func TestAllowsFolder_nilScopes(t *testing.T) {
	assert.True(t, AllowsFolder(nil, provA, folder1), "nil = unrestricted")
}

func TestAllowsFolder_allFoldersInProvider(t *testing.T) {
	// Provider listed but no folder restriction
	scopes := []ProviderScope{{ProviderID: provA, FolderIDs: nil}}
	assert.True(t, AllowsFolder(scopes, provA, folder1))
	assert.True(t, AllowsFolder(scopes, provA, folder2))
}

func TestAllowsFolder_specificFolder(t *testing.T) {
	scopes := []ProviderScope{{ProviderID: provA, FolderIDs: []uuid.UUID{folder1}}}
	assert.True(t, AllowsFolder(scopes, provA, folder1))
	assert.False(t, AllowsFolder(scopes, provA, folder2))
}

func TestAllowsFolder_wrongProvider(t *testing.T) {
	scopes := []ProviderScope{{ProviderID: provA, FolderIDs: []uuid.UUID{folder1}}}
	assert.False(t, AllowsFolder(scopes, provB, folder1))
}

func TestAllowsFolder_providerNotInList(t *testing.T) {
	scopes := []ProviderScope{{ProviderID: provA}}
	assert.False(t, AllowsFolder(scopes, provB, folder1))
}
