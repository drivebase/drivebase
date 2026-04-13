package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

const testSecret = "test-secret-that-is-long-enough-to-use"

func TestIssueAndParseAccessToken(t *testing.T) {
	userID := uuid.New()
	workspaceID := uuid.New()

	token, err := IssueAccessToken(testSecret, 15*time.Minute, userID, workspaceID)
	if err != nil {
		t.Fatalf("IssueAccessToken: %v", err)
	}

	claims, err := ParseToken(testSecret, token)
	if err != nil {
		t.Fatalf("ParseToken: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("UserID: want %v, got %v", userID, claims.UserID)
	}
	if claims.WorkspaceID != workspaceID {
		t.Errorf("WorkspaceID: want %v, got %v", workspaceID, claims.WorkspaceID)
	}
	if claims.TokenType != TokenTypeAccess {
		t.Errorf("TokenType: want %v, got %v", TokenTypeAccess, claims.TokenType)
	}
}

func TestIssueAndParseRefreshToken(t *testing.T) {
	userID := uuid.New()

	token, err := IssueRefreshToken(testSecret, 7*24*time.Hour, userID)
	if err != nil {
		t.Fatalf("IssueRefreshToken: %v", err)
	}

	claims, err := ParseToken(testSecret, token)
	if err != nil {
		t.Fatalf("ParseToken: %v", err)
	}

	if claims.TokenType != TokenTypeRefresh {
		t.Errorf("TokenType: want %v, got %v", TokenTypeRefresh, claims.TokenType)
	}
}

func TestParseToken_wrongSecret(t *testing.T) {
	token, _ := IssueAccessToken(testSecret, 15*time.Minute, uuid.New(), uuid.Nil)
	_, err := ParseToken("wrong-secret", token)
	if err == nil {
		t.Fatal("expected error with wrong secret, got nil")
	}
}

func TestParseToken_expired(t *testing.T) {
	token, _ := IssueAccessToken(testSecret, -1*time.Second, uuid.New(), uuid.Nil)
	_, err := ParseToken(testSecret, token)
	if err == nil {
		t.Fatal("expected error for expired token, got nil")
	}
}

func TestParseToken_malformed(t *testing.T) {
	_, err := ParseToken(testSecret, "not.a.jwt")
	if err == nil {
		t.Fatal("expected error for malformed token, got nil")
	}
}

func TestIssueAccessToken_uniqueJTI(t *testing.T) {
	userID := uuid.New()
	t1, _ := IssueAccessToken(testSecret, time.Minute, userID, uuid.Nil)
	t2, _ := IssueAccessToken(testSecret, time.Minute, userID, uuid.Nil)

	c1, _ := ParseToken(testSecret, t1)
	c2, _ := ParseToken(testSecret, t2)

	if c1.ID == c2.ID {
		t.Fatal("expected unique JTI for each token")
	}
}
