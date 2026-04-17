package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TokenType distinguishes access tokens from refresh tokens.
type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

// Claims are the JWT payload fields.
type Claims struct {
	UserID    uuid.UUID `json:"uid"`
	TokenType TokenType `json:"type"`
	jwt.RegisteredClaims
}

// IssueAccessToken creates a short-lived access token (15 min).
func IssueAccessToken(secret string, ttl time.Duration, userID uuid.UUID) (string, error) {
	return issueToken(secret, TokenTypeAccess, ttl, userID)
}

// IssueRefreshToken creates a long-lived refresh token (7 days).
func IssueRefreshToken(secret string, ttl time.Duration, userID uuid.UUID) (string, error) {
	return issueToken(secret, TokenTypeRefresh, ttl, userID)
}

func issueToken(secret string, tt TokenType, ttl time.Duration, userID uuid.UUID) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:    userID,
		TokenType: tt,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(), // jti — unique per token
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    "drivebase",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken validates the token signature and expiry, returning its claims.
func ParseToken(secret, tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
