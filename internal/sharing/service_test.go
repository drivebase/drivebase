package sharing

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"github.com/drivebase/drivebase/internal/ent"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
)

// ─── generateToken ───────────────────────────────────────────────────────────

func TestGenerateToken_format(t *testing.T) {
	tok, err := generateToken()
	require.NoError(t, err)
	// 32 raw bytes → 43 base64url chars (no padding)
	assert.Len(t, tok, 43)
	// only URL-safe base64 characters
	for _, c := range tok {
		assert.True(t, (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
			(c >= '0' && c <= '9') || c == '-' || c == '_',
			"unexpected character %q in token", c)
	}
}

func TestGenerateToken_unique(t *testing.T) {
	a, _ := generateToken()
	b, _ := generateToken()
	assert.NotEqual(t, a, b, "two tokens should never be identical")
}

// ─── Validate ────────────────────────────────────────────────────────────────

func makeLink(active bool, expiresAt *time.Time, passwordHash string) *ent.SharedLink {
	return &ent.SharedLink{
		Active:       active,
		ExpiresAt:    expiresAt,
		PasswordHash: passwordHash,
	}
}

func TestValidate_active(t *testing.T) {
	svc := &Service{}
	link := makeLink(true, nil, "")
	assert.NoError(t, svc.Validate(link, ""))
}

func TestValidate_inactive(t *testing.T) {
	svc := &Service{}
	link := makeLink(false, nil, "")
	assert.ErrorIs(t, svc.Validate(link, ""), ErrInactive)
}

func TestValidate_expired(t *testing.T) {
	svc := &Service{}
	past := time.Now().Add(-time.Second)
	link := makeLink(true, &past, "")
	assert.ErrorIs(t, svc.Validate(link, ""), ErrExpired)
}

func TestValidate_notYetExpired(t *testing.T) {
	svc := &Service{}
	future := time.Now().Add(time.Hour)
	link := makeLink(true, &future, "")
	assert.NoError(t, svc.Validate(link, ""))
}

func TestValidate_passwordMatch(t *testing.T) {
	svc := &Service{}
	hash, err := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)
	require.NoError(t, err)
	link := makeLink(true, nil, string(hash))
	assert.NoError(t, svc.Validate(link, "secret"))
}

func TestValidate_passwordMismatch(t *testing.T) {
	svc := &Service{}
	hash, err := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)
	require.NoError(t, err)
	link := makeLink(true, nil, string(hash))
	assert.ErrorIs(t, svc.Validate(link, "wrong"), ErrInvalidPassword)
}

func TestValidate_inactiveCheckedBeforePassword(t *testing.T) {
	// Inactive link should return ErrInactive even with correct password
	svc := &Service{}
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.MinCost)
	link := makeLink(false, nil, string(hash))
	assert.ErrorIs(t, svc.Validate(link, "secret"), ErrInactive)
}

// ─── IsFileAccessible ────────────────────────────────────────────────────────

func TestIsFileAccessible_exactMatch(t *testing.T) {
	fileID := uuid.New()
	link := &ent.SharedLink{FileNodeID: fileID}
	assert.True(t, IsFileAccessible(link, fileID, nil))
}

func TestIsFileAccessible_directChild(t *testing.T) {
	folderID := uuid.New()
	fileID := uuid.New()
	link := &ent.SharedLink{FileNodeID: folderID}
	assert.True(t, IsFileAccessible(link, fileID, &folderID))
}

func TestIsFileAccessible_differentFolder(t *testing.T) {
	folderID := uuid.New()
	otherFolder := uuid.New()
	fileID := uuid.New()
	link := &ent.SharedLink{FileNodeID: folderID}
	assert.False(t, IsFileAccessible(link, fileID, &otherFolder))
}

func TestIsFileAccessible_noParentWrongTarget(t *testing.T) {
	folderID := uuid.New()
	fileID := uuid.New()
	link := &ent.SharedLink{FileNodeID: folderID}
	assert.False(t, IsFileAccessible(link, fileID, nil))
}

// ─── middleware context helpers ──────────────────────────────────────────────

func TestSharedLinkFromCtx_nil(t *testing.T) {
	assert.Nil(t, SharedLinkFromCtx(context.Background()))
}

func TestSharedLinkFromCtx_roundtrip(t *testing.T) {
	link := &ent.SharedLink{
		ID:    uuid.New(),
		Token: "abc",
		Permissions: entschema.SharedLinkPermissions{
			Upload: true,
		},
	}
	ctx := WithSharedLink(context.Background(), link)
	got := SharedLinkFromCtx(ctx)
	require.NotNil(t, got)
	assert.Equal(t, link.ID, got.ID)
	assert.Equal(t, link.Token, got.Token)
	assert.True(t, got.Permissions.Upload)
}
