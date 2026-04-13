package auth

import (
	"context"
	"errors"

	"github.com/drivebase/drivebase/internal/ent"
	"github.com/google/uuid"
)

type contextKey int

const (
	ctxKeyUser        contextKey = iota
	ctxKeyWorkspaceID contextKey = iota
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

// WithWorkspaceID stores the active workspace ID in the context.
func WithWorkspaceID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKeyWorkspaceID, id)
}

// WorkspaceIDFromCtx retrieves the active workspace ID from context.
func WorkspaceIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ctxKeyWorkspaceID).(uuid.UUID)
	return id, ok && id != uuid.Nil
}
