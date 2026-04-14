// Package apitoken handles generation and validation of API tokens.
//
// Format:  drv_<22 base62 chars>
//
// Only the SHA-256 hash is stored in the database.
// The prefix (first 12 chars, e.g. "drv_abc123") is stored for display.
package apitoken

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"strings"
)

const (
	ScopeFilesRead      = "files:read"
	ScopeFilesWrite     = "files:write"
	ScopeProvidersRead  = "providers:read"
	ScopeProvidersWrite = "providers:write"
	ScopeTransfersRead  = "transfers:read"
	ScopeTransfersWrite = "transfers:write"
	ScopeSharingRead    = "sharing:read"
	ScopeSharingWrite   = "sharing:write"
	ScopeAdmin          = "admin"
)

var AllScopes = []string{
	ScopeFilesRead,
	ScopeFilesWrite,
	ScopeProvidersRead,
	ScopeProvidersWrite,
	ScopeTransfersRead,
	ScopeTransfersWrite,
	ScopeSharingRead,
	ScopeSharingWrite,
	ScopeAdmin,
}

const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

// Generate creates a new random API token and returns:
//   - token        — full string, show to user once and never store
//   - hash         — SHA-256 hex, store in DB
//   - displayToken — e.g. "drv_abc12345...wx9z", safe to store and show in lists
func Generate() (token, hash, displayToken string, err error) {
	var raw [16]byte
	if _, err = rand.Read(raw[:]); err != nil {
		return
	}
	suffix := encodeBase62(raw[:])
	token = "drv_" + suffix
	hash = Hash(token)
	displayToken = makeDisplayToken(token)
	return
}

// makeDisplayToken builds "drv_abc12345...wx9z" from the full token.
func makeDisplayToken(token string) string {
	const showHead = 12 // "drv_" + 8 chars
	const showTail = 4
	if len(token) <= showHead+showTail {
		return token
	}
	return token[:showHead] + "..." + token[len(token)-showTail:]
}

// Hash returns the SHA-256 hex digest of a token string.
func Hash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", sum)
}

// IsAPIToken reports whether a bearer token looks like a drivebase API token
// (as opposed to a JWT). Used in middleware to route appropriately.
func IsAPIToken(token string) bool {
	return strings.HasPrefix(token, "drv_")
}

// ValidateScope reports whether scope is a recognised scope string.
func ValidateScope(scope string) bool {
	for _, s := range AllScopes {
		if s == scope {
			return true
		}
	}
	return false
}

// HasScope reports whether scopes satisfies the required scope.
// admin always satisfies any requirement.
func HasScope(scopes []string, required string) bool {
	for _, s := range scopes {
		if s == ScopeAdmin || s == required {
			return true
		}
	}
	return false
}

func encodeBase62(b []byte) string {
	n := binary.BigEndian.Uint64(b[:8]) ^ binary.BigEndian.Uint64(b[8:])
	if n == 0 {
		return "0"
	}
	var result [22]byte
	i := 22
	for n > 0 && i > 0 {
		i--
		result[i] = base62Chars[n%62]
		n /= 62
	}
	for i > 0 {
		i--
		result[i] = '0'
	}
	return string(result[:])
}

