# Authentication & Authorization

## Overview

Authentication is JWT-based and stateless. Authorization uses a three-level RBAC system scoped to workspaces. Both are enforced in the same request pipeline but at different layers: the auth middleware handles identity, resolvers and handlers handle authorization.

## Token System

Two token types are issued together on every successful sign-in or token refresh:

**Access token** — Short-lived (15 minutes by default). Used on every authenticated request. Verified by signature alone — no database lookup. Contains:
- `uid`: user UUID
- `wid`: optional workspace UUID (when signing into a specific workspace)
- `type`: `"access"`
- Standard claims: `jti`, `iat`, `nbf`, `exp`, `iss`

**Refresh token** — Long-lived (7 days by default). Used only to obtain a new access token. Never accepted as authorization for API operations. Contains the same fields with `type: "refresh"`.

Signing algorithm is HS256 using the `auth.jwt_secret` config value.

### Workspace-Scoped Tokens

When a user signs in with a `workspaceSlug`, the issued access token embeds the workspace ID in the `wid` claim. Subsequent requests carry that workspace context automatically without needing to pass it in every query.

Without a workspace scope, the token has no `wid` claim and workspace-specific operations must include an explicit `workspaceId` argument.

## Session Management

Refresh tokens are DB-backed even though access tokens are not. On each sign-in:

1. A `Session` row is created in PostgreSQL
2. The refresh token is hashed with SHA-256 before storage — the raw token is never persisted
3. The IP address and User-Agent are recorded for auditing

On token refresh:
1. The incoming refresh token is SHA-256 hashed
2. The matching session is queried by hash
3. If the session is not revoked and not expired, new access + refresh tokens are issued and a new session row is created (old one remains for audit history)

On sign-out, the session is marked revoked. On password change, all sessions for the user are revoked in bulk.

## HTTP Middleware

Two middleware functions run on every request before any handler or resolver:

**Auth extractor** (`auth.Extractor`):
- Reads the `Authorization: Bearer <token>` header
- Validates signature and expiry
- Rejects refresh tokens (they are not valid for API authorization)
- If valid, loads the user from DB and injects it into the request context
- Does not reject the request on failure — handlers and resolvers enforce authentication themselves

**Workspace override** (inside extractor):
- Reads the `X-Workspace-ID` header
- If present and the token has no workspace claim, uses this as the active workspace
- Token's `wid` claim always takes precedence over the header

## Context Helpers

```go
// Retrieve the authenticated user. Returns nil, nil if unauthenticated.
user, err := auth.UserFromCtx(ctx)

// Retrieve the active workspace ID. Returns uuid.Nil if not set.
wsID := auth.WorkspaceIDFromCtx(ctx)

// Both together — used in most resolver auth checks.
user, wsID, err := auth.RequireAuth(ctx)
```

`RequireAuth` returns `ErrUnauthenticated` if no user is in context, eliminating boilerplate in resolvers.

## RBAC Model

Authorization is resource-scoped and hierarchical. Every permission record has:
- **Resource type**: `workspace`, `provider`, or `folder`
- **Resource ID**: a specific UUID, or `NULL` meaning "all of this type in the workspace"
- **Actions**: a JSON array from `{read, write, delete, admin}`

### Resolution Order

When checking `auth.Check(ctx, db, resourceType, resourceID, action)`:

1. Load the user's role in the active workspace via `WorkspaceMember → Role → Permission`
2. Look for a permission row matching the exact `(resourceType, resourceID)` pair
3. If none found, fall back to a permission row with `(resourceType, NULL)` — the workspace-level default
4. If still none, access is denied

The `admin` action in any matching permission grants all other actions implicitly.

### Usage in Code

Every resolver that modifies or reads workspace data calls `auth.Check` early:

```go
// Enforce read on the whole workspace
if err := auth.Check(ctx, r.DB, "workspace", prov.WorkspaceID, "read"); err != nil {
    return nil, err
}

// Enforce write on a specific provider
if err := auth.Check(ctx, r.DB, "provider", providerID, "write"); err != nil {
    return nil, err
}
```

REST handlers do the same check before touching storage providers.

## Password Security

Passwords are hashed with bcrypt before storage (cost factor 12 by default). The hash is stored in `User.password_hash`. Raw passwords are never logged or persisted.

## Error Types

| Error | Meaning |
|---|---|
| `ErrUnauthenticated` | No valid user in context |
| `ErrForbidden` | User is authenticated but lacks permission |
| `ErrInvalidCredentials` | Wrong email or password on sign-in |

`ErrForbidden` carries the action and resource type so callers can include them in error messages if needed.
