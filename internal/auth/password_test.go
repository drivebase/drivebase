package auth

import (
	"testing"
)

func TestHashPassword_roundtrip(t *testing.T) {
	hash, err := HashPassword("correct-horse-battery-staple")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !CheckPassword(hash, "correct-horse-battery-staple") {
		t.Fatal("CheckPassword returned false for correct password")
	}
}

func TestCheckPassword_wrongPassword(t *testing.T) {
	hash, _ := HashPassword("mypassword")
	if CheckPassword(hash, "wrongpassword") {
		t.Fatal("CheckPassword returned true for wrong password")
	}
}

func TestHashPassword_differentHashes(t *testing.T) {
	h1, _ := HashPassword("same")
	h2, _ := HashPassword("same")
	if h1 == h2 {
		t.Fatal("expected different hashes due to random salt")
	}
}
