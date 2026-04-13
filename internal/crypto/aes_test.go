package crypto

import (
	"bytes"
	"testing"
)

func TestEncryptDecrypt_roundtrip(t *testing.T) {
	plaintext := []byte(`{"access_token":"tok","client_id":"cid"}`)
	passphrase := "test-passphrase-that-is-long-enough-32ch"

	ciphertext, err := Encrypt(plaintext, passphrase)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}

	got, err := Decrypt(ciphertext, passphrase)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}

	if !bytes.Equal(got, plaintext) {
		t.Fatalf("want %s, got %s", plaintext, got)
	}
}

func TestEncryptDecrypt_differentNonceEachTime(t *testing.T) {
	plaintext := []byte("same plaintext")
	passphrase := "test-passphrase-that-is-long-enough-32ch"

	c1, _ := Encrypt(plaintext, passphrase)
	c2, _ := Encrypt(plaintext, passphrase)

	if bytes.Equal(c1, c2) {
		t.Fatal("expected different ciphertexts due to random nonce")
	}
}

func TestDecrypt_wrongKey(t *testing.T) {
	plaintext := []byte("secret data")
	ciphertext, _ := Encrypt(plaintext, "correct-passphrase-xxxxxxxxxxxxxxxxxx")

	_, err := Decrypt(ciphertext, "wrong-passphrase-xxxxxxxxxxxxxxxxxxxx")
	if err == nil {
		t.Fatal("expected error with wrong key, got nil")
	}
}

func TestDecrypt_tamperedData(t *testing.T) {
	plaintext := []byte("secret data")
	ciphertext, _ := Encrypt(plaintext, "correct-passphrase-xxxxxxxxxxxxxxxxxx")

	// Flip a byte in the middle
	ciphertext[len(ciphertext)/2] ^= 0xFF

	_, err := Decrypt(ciphertext, "correct-passphrase-xxxxxxxxxxxxxxxxxx")
	if err == nil {
		t.Fatal("expected error with tampered data, got nil")
	}
}

func TestDecrypt_tooShort(t *testing.T) {
	_, err := Decrypt([]byte{0x01, 0x02}, "passphrase")
	if err == nil {
		t.Fatal("expected error with too-short input, got nil")
	}
}
