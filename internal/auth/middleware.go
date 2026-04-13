package auth

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/drivebase/drivebase/internal/ent"
	"github.com/google/uuid"
)

// Extractor is HTTP middleware that reads the Authorization header,
// validates the JWT, and injects the user into the request context.
//
// It does NOT reject unauthenticated requests — resolvers/handlers
// call RequireAuth(ctx) themselves. This allows public endpoints to
// coexist on the same router.
func Extractor(secret string, db *ent.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearerToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}

			claims, err := ParseToken(secret, token)
			if err != nil {
				// Token present but invalid — still pass through; handler will reject
				next.ServeHTTP(w, r)
				return
			}

			if claims.TokenType != TokenTypeAccess {
				next.ServeHTTP(w, r)
				return
			}

			user, err := db.User.Get(r.Context(), claims.UserID)
			if err != nil {
				slog.Debug("auth extractor: user not found", "user_id", claims.UserID)
				next.ServeHTTP(w, r)
				return
			}

			ctx := WithUser(r.Context(), user)

			// If a workspace ID was in the token, inject it too
			if claims.WorkspaceID != uuid.Nil {
				ctx = WithWorkspaceID(ctx, claims.WorkspaceID)
			}

			// Allow override via X-Workspace-ID header (user switching workspace context)
			if wsHeader := r.Header.Get("X-Workspace-ID"); wsHeader != "" {
				if wsID, err := uuid.Parse(wsHeader); err == nil {
					ctx = WithWorkspaceID(ctx, wsID)
				}
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAuth is a helper for handlers/resolvers to enforce authentication.
// Returns the authenticated user or writes a 401 and returns nil.
func RequireAuth(w http.ResponseWriter, r *http.Request) (*ent.User, bool) {
	user, err := UserFromCtx(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return nil, false
	}
	return user, true
}

func extractBearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
