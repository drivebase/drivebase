package auth

import (
	"context"
	"errors"

	"github.com/drivebase/drivebase/internal/apitoken"
	"github.com/drivebase/drivebase/internal/ent"
	"github.com/google/uuid"
)

type contextKey int

const (
	ctxKeyUser           contextKey = iota
	ctxKeyTokenScopes    contextKey = iota
	ctxKeyProviderScopes contextKey = iota
)

// ErrUnauthenticated is returned when no authenticated user is in context.
var ErrUnauthenticated = errors.New("unauthenticated")

// WithUser stores the authenticated user in the context.
func WithUser(ctx context.Context, user *ent.User) context.Context {
	return context.WithValue(ctx, ctxKeyUser, user)
}

// UserFromCtx retrieves the authenticated user from context.
// Returns ErrUnauthenticated if not set.
func UserFromCtx(ctx context.Context) (*ent.User, error) {
	u, ok := ctx.Value(ctxKeyUser).(*ent.User)
	if !ok || u == nil {
		return nil, ErrUnauthenticated
	}
	return u, nil
}

// WithTokenScopes stores the API token scopes in the context.
// Only set when the request is authenticated via an API token (not JWT).
func WithTokenScopes(ctx context.Context, scopes []string) context.Context {
	return context.WithValue(ctx, ctxKeyTokenScopes, scopes)
}

// TokenScopesFromCtx returns the API token scopes, if any.
// Returns nil for JWT-authenticated requests (no scope restriction).
func TokenScopesFromCtx(ctx context.Context) ([]string, bool) {
	s, ok := ctx.Value(ctxKeyTokenScopes).([]string)
	return s, ok
}

// WithProviderScopes stores the per-provider restrictions in the context.
func WithProviderScopes(ctx context.Context, scopes []apitoken.ProviderScope) context.Context {
	return context.WithValue(ctx, ctxKeyProviderScopes, scopes)
}

// ProviderScopesFromCtx returns the provider-level restrictions, if any.
func ProviderScopesFromCtx(ctx context.Context) []apitoken.ProviderScope {
	s, _ := ctx.Value(ctxKeyProviderScopes).([]apitoken.ProviderScope)
	return s
}

// CheckTokenScope verifies that the request (API token or JWT) has the required scope.
// JWT requests pass all scope checks — scopes only apply to API tokens.
func CheckTokenScope(ctx context.Context, required string) error {
	scopes, isAPIToken := TokenScopesFromCtx(ctx)
	if !isAPIToken {
		return nil // JWT — no scope restriction
	}
	if !apitoken.HasScope(scopes, required) {
		return &ErrForbiddenScope{Required: required}
	}
	return nil
}

// CheckProviderAccess verifies the token allows access to the given provider.
func CheckProviderAccess(ctx context.Context, providerID uuid.UUID) error {
	scopes := ProviderScopesFromCtx(ctx)
	if !apitoken.AllowsProvider(scopes, providerID) {
		return &ErrForbiddenScope{Required: "provider:" + providerID.String()}
	}
	return nil
}

// CheckFolderAccess verifies the token allows access to the given folder within a provider.
func CheckFolderAccess(ctx context.Context, providerID, folderID uuid.UUID) error {
	scopes := ProviderScopesFromCtx(ctx)
	if !apitoken.AllowsFolder(scopes, providerID, folderID) {
		return &ErrForbiddenScope{Required: "folder:" + folderID.String()}
	}
	return nil
}

// ErrForbiddenScope is returned when a token lacks a required scope.
type ErrForbiddenScope struct {
	Required string
}

func (e *ErrForbiddenScope) Error() string {
	return "forbidden: token lacks scope " + e.Required
}
