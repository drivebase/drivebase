# Sharing & Temporary Links

## Overview

Two mechanisms exist for sharing files without requiring the recipient to have an account:

- **Shared links** — persistent, DB-backed tokens with optional password, expiry, and permission controls
- **Temporary links** — stateless, HMAC-signed URLs that expire at a fixed time

## Shared Links

### What They Are

A `SharedLink` record ties a token to a specific file or folder. Anyone with the token can download the target (and optionally perform other operations based on the link's permissions). The link owner can revoke it at any time.

### Creating a Shared Link

```graphql
mutation {
  createSharedLink(input: {
    workspaceID: "uuid"
    fileNodeID: "uuid"
    password: "optional"
    expiresAt: "2025-12-31T00:00:00Z"
    maxUploads: 10
    permissions: {
      upload: false
      delete: false
      mkdir: false
      rename: false
      move: false
      copy: false
    }
  }) {
    id token active
  }
}
```

The `token` field in the response is what gets shared with others. It is a 32-byte cryptographically random value encoded as base64url (43 characters). It is never re-used — each `createSharedLink` call generates a new token.

### Token Storage

Tokens are stored in plaintext in the database (unlike refresh tokens, which are hashed). This is intentional: tokens need to be looked up by value, and they are not passwords — they are bearer tokens with their own access control (expiry, revocation, optional password). The threat model assumes the database row is protected, and the token itself is the credential that gets shared.

### Validation Rules

Before a shared link grants access, `service.Validate()` checks:

1. **Active**: Link must not be revoked
2. **Expiry**: If `expires_at` is set, current time must be before it
3. **Password**: If `password_hash` is set, the caller must supply the correct password (bcrypt-verified via the `X-Share-Password` header)

Any failed check returns a distinct error type so callers can give appropriate error messages.

### File Accessibility

A shared link targets a specific `file_node_id`. `sharing.IsFileAccessible()` determines whether a given file is covered by the link:

- **Exact match**: The requested file IS the link's target
- **Direct child**: The link targets a folder and the requested file is directly inside it

Grandchildren and deeper nesting are not covered — the link only covers one level down from a folder target.

### HTTP Middleware

The sharing middleware runs on every request, after the auth extractor:

1. Reads `X-Share-Token` header or `?token=` query parameter
2. Looks up the `SharedLink` by token value
3. Calls `service.Validate()` with the password from `X-Share-Password` header (if any)
4. On success, injects the validated link into the request context
5. On failure, silently continues — the downstream handler decides whether to reject

The silent failure design means endpoints can accept either JWT auth OR a share token without requiring the middleware to know which one the caller has.

### Revocation

```graphql
mutation {
  revokeSharedLink(id: "uuid")
}
```

Sets `active = false`. The link row is not deleted so it remains available for audit queries. Once revoked, all subsequent validation attempts return `ErrInactive`.

### Listing and Querying

```graphql
query {
  sharedLinks(workspaceID: "uuid") {
    id token active expiresAt
  }
}

# Public endpoint — no auth, returns metadata for displaying share page
query {
  sharedLinkByToken(token: "...") {
    id active expiresAt permissions { upload delete }
  }
}
```

`sharedLinkByToken` intentionally does not return the password hash or workspace details — it is a public endpoint for building share landing pages.

## Temporary Links

### What They Are

Temporary links are stateless, HMAC-signed URLs. No database record is created — the URL itself contains the authorization proof. They are suited for generating time-limited download links programmatically (e.g. embedding in emails, generating presigned download buttons in a UI).

### Generating a Temp Link

```graphql
mutation {
  generateTempLink(fileNodeID: "uuid", ttlSeconds: 3600)
}
```

Returns a query string fragment: `exp=1735689600&sig=a3f4...`. To construct the full URL:

```
GET /api/v1/templink/{fileNodeID}?exp=1735689600&sig=a3f4...
```

### Signature Scheme

The signature is HMAC-SHA256 computed over `"{fileNodeID}:{exp}"` using the `auth.jwt_secret` config value as the key.

Verification:
1. Check that `exp` (Unix timestamp) is in the future — if not, return HTTP 410 Gone
2. Recompute the expected HMAC from `fileNodeID` and `exp`
3. Compare with `sig` using constant-time comparison — if mismatch, return HTTP 410 Gone

HTTP 410 (Gone) rather than 401 is used for both expired and invalid signatures to avoid leaking whether a signature was ever valid.

### No Auth Required

Requests to `/api/v1/templink/` do not need a JWT or share token. The signature IS the authorization. This makes temp links suitable for embedding in `<a href>` tags or `<img src>` attributes.

### Comparison: Shared Links vs Temp Links

| Feature | Shared Link | Temp Link |
|---|---|---|
| Database record | Yes | No |
| Revocable | Yes | No |
| Password protection | Yes | No |
| Permission control | Yes (upload, delete, etc.) | No (download only) |
| Expiry | Optional | Required (from TTL) |
| URL length | Short (just a token) | Contains exp + sig |
| Use case | Sharing with others | Short-lived programmatic access |
