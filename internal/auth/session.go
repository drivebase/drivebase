package auth

import (
	"context"
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/drivebase/drivebase/internal/ent"
	"github.com/drivebase/drivebase/internal/ent/session"
	"github.com/google/uuid"
)

// hashToken returns a SHA-256 hex digest of the token.
// We store the hash, never the raw refresh token.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", h)
}

// CreateSession persists a new session for the user and returns it.
func CreateSession(ctx context.Context, db *ent.Client, userID uuid.UUID, refreshToken, ip, userAgent string, ttl time.Duration) (*ent.Session, error) {
	return db.Session.Create().
		SetUserID(userID).
		SetRefreshTokenHash(hashToken(refreshToken)).
		SetIPAddress(ip).
		SetUserAgent(userAgent).
		SetExpiresAt(time.Now().Add(ttl)).
		Save(ctx)
}

// LookupSession finds a valid (non-revoked, non-expired) session by refresh token.
func LookupSession(ctx context.Context, db *ent.Client, refreshToken string) (*ent.Session, error) {
	return db.Session.Query().
		Where(
			session.RefreshTokenHash(hashToken(refreshToken)),
			session.Revoked(false),
			session.ExpiresAtGT(time.Now()),
		).
		WithUser().
		Only(ctx)
}

// RevokeSession marks a session as revoked by its ID.
func RevokeSession(ctx context.Context, db *ent.Client, sessionID uuid.UUID) error {
	return db.Session.UpdateOneID(sessionID).
		SetRevoked(true).
		Exec(ctx)
}

// RevokeAllUserSessions revokes every session for a user (e.g. on password change).
func RevokeAllUserSessions(ctx context.Context, db *ent.Client, userID uuid.UUID) error {
	_, err := db.Session.Update().
		Where(
			session.UserID(userID),
			session.Revoked(false),
		).
		SetRevoked(true).
		Save(ctx)
	return err
}

// ListActiveSessions returns all non-revoked sessions for a user.
func ListActiveSessions(ctx context.Context, db *ent.Client, userID uuid.UUID) ([]*ent.Session, error) {
	return db.Session.Query().
		Where(
			session.UserID(userID),
			session.Revoked(false),
			session.ExpiresAtGT(time.Now()),
		).
		Order(ent.Desc(session.FieldCreatedAt)).
		All(ctx)
}

// DeleteExpiredSessions cleans up old session rows.
func DeleteExpiredSessions(ctx context.Context, db *ent.Client) (int, error) {
	return db.Session.Delete().
		Where(session.ExpiresAtLT(time.Now())).
		Exec(ctx)
}
