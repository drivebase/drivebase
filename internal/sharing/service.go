// Package sharing manages shared links for files and folders.
// A shared link wraps a FileNode with a random token, optional password
// protection, optional expiry, and per-operation permissions.
package sharing

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/drivebase/drivebase/internal/ent"
	entschema "github.com/drivebase/drivebase/internal/ent/schema"
	entsharedlink "github.com/drivebase/drivebase/internal/ent/sharedlink"
)

// ErrExpired is returned when a shared link's expiry has passed.
var ErrExpired = fmt.Errorf("shared link has expired")

// ErrInactive is returned when a shared link has been revoked.
var ErrInactive = fmt.Errorf("shared link is not active")

// ErrInvalidPassword is returned when the supplied password is wrong.
var ErrInvalidPassword = fmt.Errorf("invalid password")

// ErrNotFound is returned when no link exists for the given token.
var ErrNotFound = fmt.Errorf("shared link not found")

// CreateInput holds the parameters for creating a shared link.
type CreateInput struct {
	UserID     uuid.UUID
	FileNodeID uuid.UUID
	Password    string // empty = no password
	ExpiresAt   *time.Time
	MaxUploads  *int
	Permissions entschema.SharedLinkPermissions
}

// Service provides CRUD and validation operations for shared links.
type Service struct {
	DB *ent.Client
}

// Create generates a new shared link with a cryptographically random token.
func (s *Service) Create(ctx context.Context, in CreateInput) (*ent.SharedLink, error) {
	token, err := generateToken()
	if err != nil {
		return nil, fmt.Errorf("sharing: generate token: %w", err)
	}

	q := s.DB.SharedLink.Create().
		SetUserID(in.UserID).
		SetFileNodeID(in.FileNodeID).
		SetToken(token).
		SetPermissions(in.Permissions).
		SetUploadCount(0).
		SetActive(true)

	if in.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("sharing: hash password: %w", err)
		}
		q = q.SetPasswordHash(string(hash))
	}
	if in.ExpiresAt != nil {
		q = q.SetExpiresAt(*in.ExpiresAt)
	}
	if in.MaxUploads != nil {
		q = q.SetMaxUploads(*in.MaxUploads)
	}

	link, err := q.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("sharing: create: %w", err)
	}
	return link, nil
}

// GetByToken fetches a shared link by its public token.
// Returns ErrNotFound if no link matches.
func (s *Service) GetByToken(ctx context.Context, token string) (*ent.SharedLink, error) {
	link, err := s.DB.SharedLink.Query().
		Where(entsharedlink.Token(token)).
		Only(ctx)
	if err != nil {
		return nil, ErrNotFound
	}
	return link, nil
}

// Validate checks that a link is active, not expired, and that the password
// matches (if the link is password-protected). Pass an empty password when
// the link has no password.
func (s *Service) Validate(link *ent.SharedLink, password string) error {
	if !link.Active {
		return ErrInactive
	}
	if link.ExpiresAt != nil && time.Now().After(*link.ExpiresAt) {
		return ErrExpired
	}
	if link.PasswordHash != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(link.PasswordHash), []byte(password)); err != nil {
			return ErrInvalidPassword
		}
	}
	return nil
}

// Revoke marks a link as inactive.
func (s *Service) Revoke(ctx context.Context, id uuid.UUID) error {
	_, err := s.DB.SharedLink.UpdateOneID(id).SetActive(false).Save(ctx)
	if err != nil {
		return fmt.Errorf("sharing: revoke: %w", err)
	}
	return nil
}

// List returns all shared links for a user.
func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]*ent.SharedLink, error) {
	links, err := s.DB.SharedLink.Query().
		Where(entsharedlink.UserID(userID)).
		Order(entsharedlink.ByCreatedAt()).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("sharing: list: %w", err)
	}
	return links, nil
}

// IsFileAccessible returns true if fileNodeID is the shared target or a direct
// child of the shared folder. Folder ancestry beyond one level is not checked
// here — callers that need deep traversal should walk ParentID themselves.
func IsFileAccessible(link *ent.SharedLink, fileNodeID uuid.UUID, parentID *uuid.UUID) bool {
	// Exact match (file share or the shared folder itself)
	if link.FileNodeID == fileNodeID {
		return true
	}
	// Direct child of shared folder
	if parentID != nil && *parentID == link.FileNodeID {
		return true
	}
	return false
}

// generateToken produces a 32-byte cryptographically random base64url token.
func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
