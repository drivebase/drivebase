# Storage Providers

## Overview

All storage backends implement a single `Provider` interface. The API layer never talks to S3 or Google Drive directly — it goes through this interface. This makes it possible to add new backends without touching any resolver or handler code.

## The Provider Interface

```go
type Provider interface {
    Type() ProviderType
    Validate(ctx context.Context) error
    List(ctx context.Context, opts ListOptions) (*ListResult, error)
    GetFile(ctx context.Context, remoteID string) (*FileInfo, error)
    Upload(ctx context.Context, params UploadParams) (*FileInfo, error)
    Download(ctx context.Context, remoteID string) (io.ReadCloser, *FileInfo, error)
    Delete(ctx context.Context, remoteID string) error
    CreateFolder(ctx context.Context, parentID, name string) (*FileInfo, error)
    Rename(ctx context.Context, remoteID, newName string) (*FileInfo, error)
    Move(ctx context.Context, remoteID, newParentID string) (*FileInfo, error)
    Copy(ctx context.Context, remoteID, newParentID string) (*FileInfo, error)
    GenerateTempLink(ctx context.Context, remoteID string, ttl time.Duration) (string, error)
}
```

`remoteID` is the provider's own identifier for a file or folder (e.g. a Google Drive file ID, an S3 object key, or a local path). It is stored in `FileNode.remote_id` and passed back to the provider on subsequent operations.

### Optional Extension: Quota

Providers that can report storage quota implement an additional interface:

```go
type QuotaProvider interface {
    Provider
    GetQuota(ctx context.Context) (*QuotaInfo, error)
}
```

The resolver checks for this interface at runtime with a type assertion and skips quota operations for backends that do not support it.

## Supported Backends

### S3 (`S3`)

Compatible with AWS S3 and any S3-compatible service (MinIO, Backblaze B2, Cloudflare R2, etc.).

Credentials JSON shape:
```json
{
  "endpoint": "https://s3.amazonaws.com",
  "region": "us-east-1",
  "bucket": "my-bucket",
  "access_key": "AKIAIOSFODNN7EXAMPLE",
  "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "use_path_style": false
}
```

Set `use_path_style: true` for MinIO and other non-AWS services that use path-style addressing.

### Google Drive (`google_drive`)

Uses OAuth 2.0. Credentials JSON holds OAuth access and refresh tokens. Token refresh is handled automatically by the Google API client.

Credentials JSON shape:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expiry": "2025-01-01T00:00:00Z",
  "client_id": "...",
  "client_secret": "..."
}
```

### Local Filesystem (`local`)

Stores files in a directory on the server's filesystem. Useful for self-hosted setups without cloud dependencies.

Credentials JSON shape:
```json
{
  "base_path": "/var/drivebase/storage"
}
```

## Credential Encryption

Provider credentials are sensitive. Before being written to `ProviderCredential.encrypted_data`, the JSON blob is encrypted with AES-256-GCM:

1. The encryption key from `crypto.encryption_key` config is SHA-256 hashed to produce a 32-byte AES key
2. A random 12-byte nonce is generated per encryption operation
3. The nonce is prepended to the ciphertext and stored as a single blob
4. On read, the first 12 bytes are extracted as the nonce and the rest is decrypted

This means the database alone — without the encryption key — cannot be used to access provider accounts.

The `internal/crypto` package handles all encrypt/decrypt operations. Callers never deal with key derivation or nonce management directly.

## Registry Pattern

Each provider package registers itself via an `init()` function:

```go
// In internal/storage/s3/s3.go
func init() {
    storage.Register(storage.ProviderTypeS3, func(credJSON string) (storage.Provider, error) {
        // parse credJSON, create S3 client, return provider
    })
}
```

The registry maps `ProviderType → FactoryFunc`. To instantiate a provider:

```go
provider, err := storage.New(providerType, decryptedCredJSON)
```

The factory receives already-decrypted JSON. Decryption happens in the resolver/handler before calling `storage.New`.

**To add a new provider**: implement the `Provider` interface, add a `storage.Register` call in `init()`, and import the package somewhere in the binary (typically in `cmd/drivebase/main.go` or `server.go` as a blank import).

## Key Data Types

**`FileInfo`** — Returned by List, GetFile, Upload, and GetFile calls:
```go
type FileInfo struct {
    RemoteID   string
    Name       string
    IsDir      bool
    Size       int64
    MimeType   string
    Checksum   string
    ModifiedAt time.Time
}
```

**`ListOptions`** — Passed to List calls:
```go
type ListOptions struct {
    ParentID  string // empty = root
    PageToken string
    PageSize  int
}
```

**`UploadParams`** — Passed to Upload calls:
```go
type UploadParams struct {
    ParentID string
    Name     string
    MimeType string
    Size     int64
    Body     io.Reader
}
```

## Provider Lifecycle

1. User calls `connectProvider(input: ConnectProviderInput)` GraphQL mutation
2. Resolver decrypts nothing (no existing credential yet), creates `Provider` + `ProviderCredential` rows with encrypted credentials
3. On every subsequent operation:
   - `loadProviderByID()` fetches the provider and credential records
   - Decrypts `encrypted_data` using the config key
   - Calls `storage.New(type, decryptedJSON)` to get a live provider instance
   - Uses the instance for the operation
4. Provider instances are not cached — a new instance is created per request. This keeps the connection lifetime short and credential rotation cheap.
