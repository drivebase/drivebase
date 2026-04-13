package sharing

import (
	"context"
	"net/http"

	"github.com/drivebase/drivebase/internal/ent"
)

type sharedLinkKey struct{}

// Extractor is HTTP middleware that reads the X-Share-Token header (or ?token=
// query param) and injects the validated *ent.SharedLink into the context.
// The password, if required, must be supplied via X-Share-Password header.
// Invalid or missing tokens are silently ignored — downstream handlers decide
// whether authentication is mandatory.
func Extractor(svc *Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := r.Header.Get("X-Share-Token")
			if token == "" {
				token = r.URL.Query().Get("token")
			}
			if token != "" {
				link, err := svc.GetByToken(r.Context(), token)
				if err == nil {
					password := r.Header.Get("X-Share-Password")
					if err := svc.Validate(link, password); err == nil {
						r = r.WithContext(WithSharedLink(r.Context(), link))
					}
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// WithSharedLink stores a validated shared link in the context.
func WithSharedLink(ctx context.Context, link *ent.SharedLink) context.Context {
	return context.WithValue(ctx, sharedLinkKey{}, link)
}

// SharedLinkFromCtx retrieves the shared link injected by Extractor, or nil.
func SharedLinkFromCtx(ctx context.Context) *ent.SharedLink {
	v, _ := ctx.Value(sharedLinkKey{}).(*ent.SharedLink)
	return v
}
