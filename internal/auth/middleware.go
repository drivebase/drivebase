package auth

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/drivebase/drivebase/internal/apitoken"
	"github.com/drivebase/drivebase/internal/ent"
	entapitoken "github.com/drivebase/drivebase/internal/ent/apitoken"
)

// Extractor is HTTP middleware that reads the Authorization header,
// validates the JWT or API token, and injects the user into the request context.
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

			if apitoken.IsAPIToken(token) {
				handleAPIToken(r, w, next, db, token)
				return
			}

			// JWT path
			claims, err := ParseToken(secret, token)
			if err != nil {
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
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func handleAPIToken(r *http.Request, w http.ResponseWriter, next http.Handler, db *ent.Client, raw string) {
	hash := apitoken.Hash(raw)

	tok, err := db.ApiToken.Query().
		Where(entapitoken.TokenHash(hash)).
		WithUser().
		Only(r.Context())
	if err != nil {
		slog.Debug("api token not found", "hash_prefix", hash[:8])
		next.ServeHTTP(w, r)
		return
	}

	// Check expiry
	if tok.ExpiresAt != nil && time.Now().After(*tok.ExpiresAt) {
		slog.Debug("api token expired", "id", tok.ID)
		next.ServeHTTP(w, r)
		return
	}

	// Update last_used_at async — don't block the request
	go func() {
		now := time.Now()
		_ = db.ApiToken.UpdateOneID(tok.ID).SetLastUsedAt(now).Exec(r.Context())
	}()

	user := tok.Edges.User
	if user == nil {
		next.ServeHTTP(w, r)
		return
	}

	ctx := WithUser(r.Context(), user)
	ctx = WithTokenScopes(ctx, tok.Scopes)
	if len(tok.ProviderScopes) > 0 {
		ctx = WithProviderScopes(ctx, tok.ProviderScopes)
	}

	next.ServeHTTP(w, r.WithContext(ctx))
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
