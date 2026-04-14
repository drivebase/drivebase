package resolver

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/drivebase/drivebase/internal/auth"
	"github.com/drivebase/drivebase/internal/crypto"
	"github.com/drivebase/drivebase/internal/ent"
	entpc "github.com/drivebase/drivebase/internal/ent/providercredential"
	entproviderquota "github.com/drivebase/drivebase/internal/ent/providerquota"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	"github.com/drivebase/drivebase/internal/graph"
	"github.com/drivebase/drivebase/internal/storage"
	"github.com/google/uuid"
)

// httpRequestKey is the context key for the HTTP request.
type httpRequestKey struct{}

// WithHTTPRequest stores the HTTP request in context for resolvers to access metadata.
func WithHTTPRequest(ctx context.Context, r *http.Request) context.Context {
	return context.WithValue(ctx, httpRequestKey{}, r)
}

// issueAccessToken returns a new workspace-scoped access token without creating a session.
// Used by switchWorkspace — the existing refresh token/session is kept intact.
func (r *mutationResolver) issueAccessToken(u *ent.User, workspaceID uuid.UUID) (string, error) {
	return auth.IssueAccessToken(
		r.Config.Auth.JWTSecret,
		r.Config.Auth.AccessTokenTTL,
		u.ID,
		workspaceID,
	)
}

// issueTokens creates a new session and returns a fresh AuthPayload.
func (r *mutationResolver) issueTokens(ctx context.Context, u *ent.User, workspaceID uuid.UUID) (*graph.AuthPayload, error) {
	accessToken, err := auth.IssueAccessToken(
		r.Config.Auth.JWTSecret,
		r.Config.Auth.AccessTokenTTL,
		u.ID,
		workspaceID,
	)
	if err != nil {
		return nil, fmt.Errorf("internal error")
	}

	refreshToken, err := auth.IssueRefreshToken(
		r.Config.Auth.JWTSecret,
		r.Config.Auth.RefreshTokenTTL,
		u.ID,
	)
	if err != nil {
		return nil, fmt.Errorf("internal error")
	}

	ip, ua := "", ""
	if req, ok := ctx.Value(httpRequestKey{}).(*http.Request); ok {
		ip = req.RemoteAddr
		ua = req.Header.Get("User-Agent")
	}

	if _, err := auth.CreateSession(ctx, r.DB, u.ID, refreshToken, ip, ua, r.Config.Auth.RefreshTokenTTL); err != nil {
		return nil, fmt.Errorf("internal error")
	}

	return &graph.AuthPayload{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         mapUser(u),
	}, nil
}

// loadProviderByID decrypts credentials and returns a live Provider instance.
func loadProviderByID(ctx context.Context, db *ent.Client, encKey string, providerID uuid.UUID) (storage.Provider, error) {
	p, err := db.Provider.Get(ctx, providerID)
	if err != nil {
		return nil, fmt.Errorf("provider not found")
	}

	cred, err := db.ProviderCredential.Query().
		Where(entpc.ProviderID(providerID)).
		Only(ctx)
	if err != nil {
		return nil, fmt.Errorf("provider credentials not found")
	}

	plaintext, err := crypto.Decrypt(cred.EncryptedData, encKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt provider credentials")
	}

	return storage.New(storage.ProviderType(p.Type), storage.Credentials(plaintext))
}

// refreshQuota fetches live quota from the provider and upserts the DB record.
func refreshQuota(ctx context.Context, r *Resolver, providerID uuid.UUID) (*graph.ProviderQuota, error) {
	p, err := r.DB.Provider.Get(ctx, providerID)
	if err != nil {
		return nil, fmt.Errorf("provider not found")
	}
	if err := auth.Check(ctx, r.DB, string(entschema.ResourceTypeWorkspace), p.WorkspaceID, string(entschema.ActionWrite)); err != nil {
		return nil, err
	}

	sp, err := loadProviderByID(ctx, r.DB, r.Config.Crypto.EncryptionKey, providerID)
	if err != nil {
		return nil, err
	}

	qp, ok := sp.(storage.QuotaProvider)
	if !ok {
		return nil, fmt.Errorf("this provider does not support quota reporting")
	}

	info, err := qp.GetQuota(ctx)
	if err != nil {
		return nil, fmt.Errorf("get quota: %w", err)
	}

	now := time.Now()

	// Upsert: try update first, create if not exists
	existing, err := r.DB.ProviderQuota.Query().
		Where(entproviderquota.ProviderID(providerID)).
		Only(ctx)
	if err != nil {
		// Create new record
		q, err := r.DB.ProviderQuota.Create().
			SetProviderID(providerID).
			SetTotalBytes(info.TotalBytes).
			SetUsedBytes(info.UsedBytes).
			SetFreeBytes(info.FreeBytes).
			SetTrashBytes(info.TrashBytes).
			SetPlanName(info.PlanName).
			SetExtra(info.Extra).
			SetSyncedAt(now).
			Save(ctx)
		if err != nil {
			return nil, fmt.Errorf("save quota: %w", err)
		}
		return mapProviderQuota(q), nil
	}

	// Update existing record
	q, err := r.DB.ProviderQuota.UpdateOneID(existing.ID).
		SetTotalBytes(info.TotalBytes).
		SetUsedBytes(info.UsedBytes).
		SetFreeBytes(info.FreeBytes).
		SetTrashBytes(info.TrashBytes).
		SetPlanName(info.PlanName).
		SetExtra(info.Extra).
		SetSyncedAt(now).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("update quota: %w", err)
	}
	return mapProviderQuota(q), nil
}

func authTypeForProvider(t storage.ProviderType) entschema.AuthType {
	switch t {
	case storage.ProviderTypeGoogleDrive:
		return entschema.AuthTypeOAuth
	case storage.ProviderTypeS3:
		return entschema.AuthTypeAPIKey
	case storage.ProviderTypeLocal:
		return entschema.AuthTypeNone
	default:
		return entschema.AuthTypeNone
	}
}

// withTx runs fn inside a database transaction, rolling back on error or panic.
func withTx(ctx context.Context, client *ent.Client, fn func(tx *ent.Tx) error) error {
	tx, err := client.Tx(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if v := recover(); v != nil {
			_ = tx.Rollback()
			panic(v)
		}
	}()
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
