# E2E Encrypted File Uploads

Optional client-side encryption where the server never sees plaintext file contents. Pattern used by Proton Drive, Bitwarden, etc.

## Overview

Encryption is opt-in per upload. Unencrypted files work exactly as today.

## Key Setup (once per user)

1. User enters a vault passphrase
2. Browser derives a Key Encryption Key (KEK) via PBKDF2(passphrase, salt, 600k iterations)
3. Browser generates an RSA-OAEP or ECDH keypair using Web Crypto API
4. Private key is encrypted with KEK → `encrypted_private_key`
5. `{ public_key, encrypted_private_key, salt }` stored on server
6. Server never sees the passphrase or plaintext private key

## Encrypted Upload

1. Browser generates a random AES-256-GCM key
2. File encrypted with AES key → ciphertext
3. AES key wrapped with user's public key → `encrypted_file_key`
4. Multipart upload sends ciphertext + `encrypted_file_key` field

## Download

1. Server returns encrypted file + `encrypted_file_key` header
2. User unlocks vault (passphrase → KEK → decrypt private key)
3. Private key unwraps the AES key
4. AES key decrypts the file

## What the Server Stores

| Field | Value |
|---|---|
| `public_key` | Plaintext (safe) |
| `encrypted_private_key` | Ciphertext (useless without passphrase) |
| `key_salt` | Random bytes (not secret) |
| `encrypted_file_key` | Ciphertext (useless without private key) |
| File content | Ciphertext (useless without file key) |

## Backend Changes Required

**Schema:**
- `user`: add `public_key`, `encrypted_private_key`, `key_salt`
- `file_node`: add `client_encrypted bool`, `encrypted_file_key`

**New REST endpoints:**
- `POST /api/v1/keys` — store keypair setup
- `GET /api/v1/keys` — return encrypted private key + salt for browser decryption

**Upload handler:**
- Accept optional `encrypted_file_key` form field
- If present, mark `client_encrypted=true` on FileNode

**Download handler:**
- If `client_encrypted`, include `X-Encrypted-File-Key` in response headers

**Skip for encrypted files:** preview generation, checksum, MIME detection.

## Frontend (browser-side, separate repo)

All crypto via Web Crypto API (`crypto.subtle`):
- Key generation, PBKDF2 derivation, AES-GCM encrypt/decrypt, RSA-OAEP wrap/unwrap
- Vault unlock UI (passphrase prompt)
- Upload toggle ("Encrypt this file")

## Scope estimate

- Backend: ~200 lines
- Frontend: majority of the work
