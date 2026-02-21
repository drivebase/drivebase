# Vault — End-to-End Encrypted Storage

The Vault is a private, per-user encrypted file storage area inside Drivebase. All files are encrypted **client-side** before upload. The server stores only ciphertext and encrypted key material — it never sees plaintext file content or the user's raw private key.

---

## Cryptographic Design

### Key Hierarchy

```
Passphrase
    │
    ▼ PBKDF2 (310,000 iterations, SHA-256, random 16-byte salt)
   KEK (Key Encryption Key) — AES-GCM 256-bit, never stored
    │
    ▼ AES-GCM encrypt
  Encrypted Private Key ──────────────────────────┐
                                                   │ stored in DB (vaults table)
  P-256 ECDH Key Pair ────────────── Public Key ──┘
    │
    │ ECIES (Ephemeral ECDH + HKDF + AES-GCM)
    ▼
  Encrypted File Key ─── stored per file in DB (files.encrypted_file_key)
    │
    ▼ AES-GCM 256-bit
  Encrypted File Content ─── stored in storage provider (S3, local, etc.)
```

A separate **recovery key** path also encrypts the private key independently of the passphrase. This is embedded in the backup file and never sent to the server:

```
random 32 bytes (recovery key)
    │
    ▼ imported as raw AES-GCM-256 key
  Recovery-Encrypted Private Key ─── backup file only, never sent to server
```

### Algorithms

| Purpose | Algorithm |
|---------|-----------|
| KEK derivation | PBKDF2, SHA-256, 310,000 iterations |
| Asymmetric keypair | P-256 ECDH (Web Crypto API) |
| Private key encryption | AES-GCM 256-bit, random 12-byte IV |
| Recovery key generation | 32 cryptographically random bytes (Web Crypto `getRandomValues`) |
| Recovery key encryption | AES-GCM 256-bit, raw key import, random 12-byte IV |
| File key wrapping | ECIES: ephemeral P-256 + HKDF-SHA-256 + AES-GCM |
| File encryption | AES-GCM 256-bit, random 12-byte IV |
| Chunk encryption | AES-GCM 256-bit, **deterministic** 12-byte IV (big-endian chunk index) |

### Chunked File Encryption

For files > 50 MB, the file is split into 50 MB plaintext chunks. Each chunk is encrypted with the same per-file AES-GCM key but with a deterministic IV:

```
IV = 12-byte big-endian encoding of chunkIndex (0, 1, 2, ...)
Encrypted chunk = IV (12 bytes) + ciphertext + AES-GCM tag (16 bytes)
Overhead per chunk = 28 bytes
```

This means no per-chunk IV needs to be stored separately — the server only needs to know the original chunk size to reconstruct IVs during decryption.

---

## Database Schema

### `vaults` table

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | cuid2 |
| userId | text, unique | FK → users.id (cascade delete) |
| publicKey | text | JWK-encoded P-256 public key |
| encryptedPrivateKey | text | Base64(IV + ciphertext) of AES-GCM encrypted private key JWK |
| kekSalt | text | Base64 PBKDF2 salt |
| createdAt | timestamp(tz) | |
| updatedAt | timestamp(tz) | |

### Added columns to `files`

| Column | Type | Notes |
|--------|------|-------|
| vaultId | text, nullable | FK → vaults.id (cascade delete) |
| isEncrypted | boolean | default false |
| encryptedFileKey | text, nullable | Base64 ECIES blob |
| encryptedChunkSize | integer, nullable | Plaintext chunk size used during encrypted chunked upload |

### Added columns to `folders`

| Column | Type | Notes |
|--------|------|-------|
| vaultId | text, nullable | FK → vaults.id (cascade delete) |

---

## Server Architecture

### VaultService (`apps/api/services/vault.ts`)

Central service class with methods:

- `getVault(db, userId)` — fetch the user's vault record
- `setupVault(db, userId, publicKey, encryptedPrivateKey, kekSalt)` — create vault; throws ConflictError if already exists
- `changePassphrase(db, userId, encryptedPrivateKey, kekSalt)` — re-encrypt private key with new KEK
- `getVaultContents(db, userId, path)` — list files/folders at a vault path
- `requestVaultUpload(...)` — generate upload URL/slot, create file record with `vaultId` set and `isEncrypted: true`
- `requestVaultDownload(db, userId, fileId)` — validate ownership, return download URL + `encryptedFileKey`
- `createVaultFolder(...)` — create folder with `vaultId` set
- `deleteVaultFile`, `renameVaultFile`, `starVaultFile`, `unstarVaultFile` — validate vault ownership, delegate to file operations
- `prepareVaultChunkedUpload(...)` — initiate a chunked upload session for vault files

### Vault Isolation in Queries

All regular file queries (`getFile`, `listFiles`, `searchFiles`, `getContents`, `getStarredFiles`) include `isNull(files.vaultId)` and `isNull(folders.vaultId)` in their WHERE clauses. This ensures vault files never appear in the regular /files view.

Vault files use virtual paths scoped to `/vault/{userId}/...`.

### GraphQL API (`apps/api/graphql/schema/vault.graphql`)

**Queries:**
- `myVault: Vault` — fetch current user's vault (null if not set up)
- `vaultContents(path: String!): PathContents!` — list files/folders at path

**Mutations:**
- `setupVault(input: SetupVaultInput!): Vault!`
- `changeVaultPassphrase(input: ChangeVaultPassphraseInput!): Vault!`
- `requestVaultUpload(input: RequestVaultUploadInput!): VaultUploadResponse!`
- `requestVaultDownload(id: ID!): VaultDownloadResponse!`
- `createVaultFolder(name: String!, parentId: ID): Folder!`
- `deleteVaultFile(id: ID!): Boolean!`
- `renameVaultFile(id: ID!, name: String!): File!`
- `starVaultFile(id: ID!): File!`
- `unstarVaultFile(id: ID!): File!`
- `initiateVaultChunkedUpload(input: InitiateVaultChunkedUploadInput!): ChunkedUploadSession!`

---

## Client Architecture

### Crypto Library (`apps/web/src/features/vault/lib/crypto.ts`)

Pure, stateless Web Crypto API module. No external dependencies.

Key functions:

```typescript
deriveKEK(passphrase: string, salt: Uint8Array): Promise<CryptoKey>
generateKeyPair(): Promise<CryptoKeyPair>
encryptPrivateKey(privateKey: CryptoKey, kek: CryptoKey): Promise<string>
decryptPrivateKey(encryptedData: string, kek: CryptoKey): Promise<CryptoKey>
generateRecoveryKey(): string                                    // Base64(32 random bytes)
encryptPrivateKeyWithRecoveryKey(privateKey: CryptoKey, recoveryKeyB64: string): Promise<string>
decryptPrivateKeyWithRecoveryKey(encryptedData: string, recoveryKeyB64: string): Promise<CryptoKey>
generateFileKey(): Promise<CryptoKey>
encryptFileKey(fileKey: CryptoKey, recipientPublicKey: CryptoKey): Promise<string>
decryptFileKey(encryptedFileKey: string, privateKey: CryptoKey): Promise<CryptoKey>
encryptFile(data: ArrayBuffer, fileKey: CryptoKey): Promise<ArrayBuffer>
decryptFile(encryptedData: ArrayBuffer, fileKey: CryptoKey): Promise<ArrayBuffer>
encryptChunk(chunk: ArrayBuffer, fileKey: CryptoKey, chunkIndex: number): Promise<ArrayBuffer>
decryptChunk(encryptedChunk: ArrayBuffer, fileKey: CryptoKey, chunkIndex: number): Promise<ArrayBuffer>
getKeyFingerprint(publicKey: JsonWebKey): Promise<string>
generateSalt(): Uint8Array<ArrayBuffer>
createBackup(publicKey, encryptedPrivateKey, kekSalt, recoveryKey, recoveryEncryptedPrivateKey): VaultBackup
parseBackup(json: string): VaultBackup
```

### Vault Store (`apps/web/src/features/vault/store/vaultStore.ts`)

Zustand store. Persisted fields go to `localStorage`; `decryptedPrivateKey` is **in-memory only** and is lost when the tab closes (requiring the user to re-enter their passphrase).

```typescript
State:
  publicKey: string | null           // JWK string, persisted to localStorage
  encryptedPrivateKey: string | null // persisted to localStorage
  kekSalt: string | null             // persisted to localStorage
  decryptedPrivateKey: CryptoKey | null  // in-memory only, never persisted

Derived:
  isUnlocked: boolean  // decryptedPrivateKey !== null
  isSetUp: boolean     // publicKey !== null
```

### useVaultCrypto (`apps/web/src/features/vault/hooks/useVaultCrypto.ts`)

Composes the crypto library, vault store, and GraphQL mutations into high-level operations:

- `setupVault(passphrase)` — generate keypair → derive KEK → encrypt private key → generate recovery key → encrypt private key with recovery key → call `setupVault` mutation → unlock store in memory → return backup object
- `unlockVault(passphrase)` — derive KEK from stored salt → decrypt stored private key → store `CryptoKey` in memory
- `lockVault()` — clear `decryptedPrivateKey` from memory
- `encryptForUpload(file)` — generate fileKey → encrypt file → ECIES-wrap fileKey → return `{ encryptedBlob, encryptedFileKey }`
- `decryptDownload(encryptedData, encryptedFileKey)` — ECIES-unwrap fileKey → decrypt file → return `ArrayBuffer`
- `changePassphrase(currentPassphrase, newPassphrase)` — decrypt private key with current passphrase → re-encrypt with new passphrase → call mutation
- `downloadBackup(backup)` — serialize backup to JSON, trigger browser download
- `restoreFromBackup(file, newPassphrase)` — parse JSON → decrypt private key using embedded recovery key (no old passphrase needed) → re-encrypt with newPassphrase → call `setupVault` mutation → unlock store
- `getFingerprint()` — SHA-256 fingerprint of public key (first 32 hex chars)

### Upload Flow

**Small files (< 50 MB):**
1. `encryptForUpload(file)` → `{ encryptedBlob, encryptedFileKey }`
2. `requestVaultUpload({ ..., encryptedFileKey })` → upload URL
3. POST/PUT encrypted blob to upload URL

**Large files (> 50 MB):**
1. Generate `fileKey` locally
2. ECIES-wrap `fileKey` → `encryptedFileKey`
3. `initiateVaultChunkedUpload({ ..., encryptedFileKey })` → `{ sessionId, presignedPartUrls? }`
4. For each chunk: `encryptChunk(plaintextChunk, fileKey, chunkIndex)`
5. Upload encrypted chunks (S3 presigned PUTs or proxy POST)
6. For S3 direct: call `completeS3MultipartUpload` with ETags

### Download Flow

1. `requestVaultDownload(fileId)` → `{ downloadUrl, encryptedFileKey }`
2. `fetch(downloadUrl, { headers: { Authorization: "Bearer <token>" } })` → encrypted `ArrayBuffer`
3. `decryptDownload(encryptedBuffer, encryptedFileKey)` → plaintext `ArrayBuffer`
4. Create `Blob` → `URL.createObjectURL` → trigger `<a>` download

---

## UI Flow

```
/vault route
  │
  ├── myVault === null ──────────────► VaultSetupWizard
  │                                     Step 1: Welcome / E2EE explanation
  │                                     Step 2: Create passphrase (with strength indicator)
  │                                     Step 3: Download backup key
  │
  ├── myVault exists, !isUnlocked ──► VaultUnlockPrompt
  │                                     Passphrase input → unlockVault()
  │                                     OR: Restore from backup key:
  │                                       1. Upload backup JSON (validated client-side)
  │                                       2. Set a new passphrase
  │                                       3. Submit → decrypt via recovery key → re-encrypt → unlock
  │
  └── isUnlocked ────────────────────► VaultFileBrowser
                                        File/folder table (encrypted uploads/downloads)
                                        Breadcrumb navigation
                                        Drag-and-drop upload zone
                                        Upload progress panel
```

---

## Key Security Properties

- **Zero-knowledge server**: The server stores only ciphertext. It cannot decrypt any vault file.
- **Passphrase-derived KEK**: The encryption key for the private key is derived from the passphrase and never stored. Forgetting the passphrase = losing access (unless backup is used).
- **Non-extractable private key**: After decryption, the P-256 private key is imported with `extractable: false` so it cannot be exported from the Web Crypto API.
- **Tab-close eviction**: The decrypted `CryptoKey` lives only in Zustand memory. Closing or refreshing the tab clears it, requiring re-entry of the passphrase.
- **Recovery key backup**: The backup file contains a random 32-byte recovery key alongside the recovery-encrypted private key. Restoring requires only the backup file — no original passphrase. The user sets a new passphrase on restore. The recovery key is never sent to the server.
- **Passphrase-change resilience**: Changing the passphrase does not invalidate existing backup files, because the recovery key is independent of the passphrase.
- **Vault isolation**: Vault files never appear in regular file views — all standard file queries explicitly exclude rows with a non-null `vaultId`.
