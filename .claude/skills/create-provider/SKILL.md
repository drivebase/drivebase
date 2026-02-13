---
name: create-provider
description: Create a fully integrated storage provider package for Drivebase.
---

## Overview

Every provider lives in `packages/<provider-name>/` and is integrated into `apps/api`. Use `packages/google-drive` (OAuth) or `packages/s3` (API key) as reference implementations.

---

## Step 1 — Create the package

### `packages/<name>/package.json`
```json
{
  "name": "@drivebase/<name>",
  "version": "0.1.0",
  "module": "index.ts",
  "type": "module",
  "private": true,
  "description": "<Description>",
  "exports": { ".": "./index.ts" },
  "dependencies": {
    "@drivebase/core": "workspace:*",
    "zod": "^3.22.4"
  },
  "devDependencies": { "@types/bun": "latest" },
  "peerDependencies": { "typescript": "^5" }
}
```
Add any provider-specific SDK dependency to `dependencies`.

### `packages/<name>/tsconfig.json`
Copy verbatim from `packages/google-drive/tsconfig.json`.

---

## Step 2 — Write `schema.ts`

Define a Zod schema, a TypeScript type, sensitive fields, and UI config fields.

```ts
import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const <Name>ConfigSchema = z.object({
  // Fields needed before OAuth callback (e.g. clientId, clientSecret)
  // Fields populated after OAuth callback are optional (refreshToken, accessToken)
});

export type <Name>Config = z.infer<typeof <Name>ConfigSchema>;

// Fields encrypted at rest — secrets and tokens
export const <Name>SensitiveFields = ["<field>"] as const;

// Fields shown to the user in the Connect Provider UI
// Tokens are NOT shown — they come from OAuth
export const <Name>ConfigFields: ProviderConfigField[] = [
  {
    name: "<field>",
    label: "<Label>",
    type: "text" | "password",
    required: true,
    description: "<Help text>",
    placeholder: "<Placeholder>",
  },
];
```

**Rules:**
- NEVER use `any` type.
- All secrets go in `SensitiveFields` (encrypted with AES-256-GCM).
- Tokens obtained via OAuth are `optional()` in the schema; they must not appear in `ConfigFields`.

---

## Step 3 — Write `oauth.ts` (OAuth providers only)

```ts
import type { OAuthInitResult, ProviderConfig } from "@drivebase/core";
import { ProviderError } from "@drivebase/core";

export async function initiate<Name>OAuth(
  config: ProviderConfig,
  callbackUrl: string,
  state: string,
): Promise<OAuthInitResult> { ... }

export async function handle<Name>OAuthCallback(
  config: ProviderConfig,
  code: string,
  callbackUrl: string,
): Promise<ProviderConfig> {
  // Exchange code for tokens, return { ...config, refreshToken, accessToken }
}
```

**Rules:**
- Always request offline access so a `refresh_token` is issued.
- Throw `ProviderError("<name>", "...")` (never return null/undefined for errors).
- The callback URL is a fixed pre-registered redirect URI — use as-is, never construct it here.
- The `state` parameter carries `<providerId>:<csrfToken>` — pass through unchanged.

---

## Step 4 — Write `provider.ts`

Implement `IStorageProvider` from `@drivebase/core`.

```ts
import type { IStorageProvider, ProviderConfig, ... } from "@drivebase/core";
import { ProviderError } from "@drivebase/core";

export class <Name>Provider implements IStorageProvider {
  async initialize(config: ProviderConfig): Promise<void> { ... }
  async testConnection(): Promise<boolean> { ... }
  async cleanup(): Promise<void> { ... }
  async getQuota(): Promise<ProviderQuota> { ... }
  async requestUpload(options: UploadOptions): Promise<UploadResponse> { ... }
  async uploadFile(remoteId: string, data: ReadableStream | Buffer): Promise<void> { ... }
  async requestDownload(options: DownloadOptions): Promise<DownloadResponse> { ... }
  async downloadFile(remoteId: string): Promise<ReadableStream> { ... }
  async createFolder(options: CreateFolderOptions): Promise<string> { ... }
  async delete(options: DeleteOptions): Promise<void> { ... }
  async move(options: MoveOptions): Promise<void> { ... }
  async copy(options: CopyOptions): Promise<string> { ... }
  async list(options: ListOptions): Promise<ListResult> { ... }
  async getFileMetadata(remoteId: string): Promise<FileMetadata> { ... }
  async getFolderMetadata(remoteId: string): Promise<FolderMetadata> { ... }

  // Non-standard, called by the service after OAuth to store account info
  async getAccountInfo(): Promise<{ email?: string; name?: string }> { ... }
}
```

### remoteId strategy

The `remoteId` is the permanent identifier stored in the database for each file/folder.

- **Prefer stable IDs** (e.g. `id:abc123` in Dropbox, numeric IDs in Box) over mutable paths.
- If the API requires a path for uploads (e.g. Dropbox), use `path_lower` as remoteId throughout for consistency.
- The `fileId` returned by `requestUpload` is stored as `remoteId` in the DB — make sure it's usable by `uploadFile` as-is.

### Upload flow

- **Direct (presigned URL):** return `{ fileId, uploadUrl, uploadFields, useDirectUpload: true }` — the client uploads directly.
- **Proxy:** return `{ fileId, uploadUrl: undefined, useDirectDownload: false }` — the server streams through `/api/upload/proxy`.
- Set `supportsPresignedUrls: false` in the registration when all uploads are proxied.

### Download flow

- **Direct URL:** call the provider's "temporary link" / presigned URL endpoint in `requestDownload` and return `{ downloadUrl, useDirectDownload: true }`.
- **Proxy:** return `{ downloadUrl: undefined, useDirectDownload: false }` and implement `downloadFile` for streaming.

### OAuth pending state

```ts
async initialize(config: ProviderConfig): Promise<void> {
  // validate config
  if (!this.config.refreshToken) return; // pending OAuth — skip client setup
  // otherwise build the API client
}

async testConnection(): Promise<boolean> {
  if (!this.config?.refreshToken) return false; // not throws — pending state
  // ...
}
```

### Token refresh

Refresh access tokens in-memory. On a 401 response, refresh and retry once. Do NOT persist the new access token back to the DB (no mechanism for that in providers).

### Error handling

- Use `ProviderError("<provider-type>", "message", { ...context })` for all provider errors.
- NEVER use non-null assertions (`!`). Call `ensureInitialized()` private helper and throw if null.
- Validate config with `Schema.safeParse` in `initialize`, throw `ProviderError` on failure.

### cleanup()

Null out all client references so GC can reclaim them:
```ts
async cleanup(): Promise<void> {
  this.client = null;
  this.config = null;
}
```

---

## Step 5 — Write `index.ts`

Export everything and define the `ProviderRegistration`:

```ts
export { handle<Name>OAuthCallback, initiate<Name>OAuth } from "./oauth"; // OAuth only
export { <Name>Provider } from "./provider";
export type { <Name>Config } from "./schema";
export { <Name>ConfigFields, <Name>ConfigSchema, <Name>SensitiveFields } from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
// ... imports

export const <camelName>Registration: ProviderRegistration = {
  factory: () => new <Name>Provider(),
  configSchema: <Name>ConfigSchema,
  configFields: <Name>ConfigFields,
  description: "<Human-readable description>",
  supportsPresignedUrls: true | false,
  authType: "oauth" | "api_key" | "no_auth",
  initiateOAuth: initiate<Name>OAuth,         // OAuth only
  handleOAuthCallback: handle<Name>OAuthCallback, // OAuth only
};
```

---

## Step 6 — Add the provider type to core

In `packages/core/enums.ts`, add to `ProviderType`:
```ts
<NAME> = "<name>",
```

---

## Step 7 — Add the DB enum value

In `packages/db/schema/providers.ts`:
```ts
export const providerTypeEnum = pgEnum("provider_type", [
  "google_drive", "s3", "local", "dropbox", "<name>", // add here
]);
```

---

## Step 8 — Create a DB migration

Create `packages/db/migrations/<index>_add_<name>_provider.sql`:
```sql
ALTER TYPE "public"."provider_type" ADD VALUE '<name>';
```

Update `packages/db/migrations/meta/_journal.json` — add a new entry with the next `idx`:
```json
{
  "idx": <next>,
  "version": "7",
  "when": <timestamp>,
  "tag": "<index>_add_<name>_provider",
  "breakpoints": true
}
```

---

## Step 9 — Register in the API

### `apps/api/config/providers.ts`

1. Import the registration and sensitive fields from `@drivebase/<name>`.
2. Add to `providerRegistry`: `[ProviderType.<NAME>]: <camelName>Registration`
3. Add to `providerSensitiveFields`: `[ProviderType.<NAME>]: <Name>SensitiveFields`
4. Add a `case` in `getProviderName()` returning the display name.

### `apps/api/package.json`

Add `"@drivebase/<name>": "workspace:*"` to `dependencies`.

---

## Step 10 — Install and verify

```bash
bun install
bunx tsc --noEmit -p packages/<name>/tsconfig.json
bunx tsc --noEmit -p apps/api/tsconfig.json 2>&1 | grep -i <name>
```

Zero errors from the new package. Pre-existing errors in the API are acceptable.

---

## Step 11 — Update the README

In `README.md`, find the `## Supported Providers` section and mark the new provider as done:

```md
- [x] <Provider Display Name>    ← change [ ] to [x], move above unchecked items
```

Keep the list ordered: completed providers first, then planned ones.

---

## Step 12 — Add a docs page

### Create `apps/www/content/docs/storage-providers/<name>.mdx`

Structure the page to match existing provider docs:

```mdx
---
title: <Provider Display Name>
description: Connect <Provider> accounts using <auth method>
---

<One-line summary of what this provider does.>

## Prerequisites

<Steps to create credentials in the provider's developer console.>

### 1. <First setup step>
### 2. <Second setup step — permissions/scopes>
### 3. Set the Redirect URI
  - Development: `http://localhost:4000/webhook/callback`
  - Production: `https://api.yourdomain.com/webhook/callback`
### 4. Note Your Credentials
  — list the fields the user will paste into Drivebase

## Connecting in Drivebase

1. Navigate to the **Providers** page.
2. Click **Connect Provider** and select **<Name>**.
3. Enter your credentials.
4. Click **Connect** and complete the authorization flow.

<Callout type="info">
Any important notes about token storage, scopes, or limitations.
</Callout>

## Notes

- Any remoteId strategy, upload/download method, or behavioral quirks worth documenting.
```

**Rules:**
- Always include the exact redirect URI format for both dev and prod.
- Mention which fields are sensitive / encrypted.
- If uploads go through the Drivebase proxy (no presigned URLs), say so explicitly.
- If downloads use temporary/presigned links, describe the expiry.

### Register the page in `apps/www/content/docs/storage-providers/meta.json`

Append the slug to the `pages` array:
```json
{ "pages": ["overview", "local", "s3", "google-drive", ..., "<name>"] }
```

### Add the provider to the overview page

In `apps/www/content/docs/storage-providers/overview.mdx`, add a bullet under **Supported Providers**:
```md
- **[<Display Name>](/docs/storage-providers/<name>)**: <One-line description.>
```

---

## Checklist

- [ ] `packages/<name>/package.json` — correct name, `workspace:*` deps
- [ ] `packages/<name>/tsconfig.json` — copied from google-drive
- [ ] `schema.ts` — Zod schema, sensitive fields, UI fields
- [ ] `oauth.ts` — initiate + callback handlers (OAuth providers)
- [ ] `provider.ts` — all `IStorageProvider` methods implemented, `getAccountInfo()` present
- [ ] `index.ts` — registration exported
- [ ] `packages/core/enums.ts` — `ProviderType` updated
- [ ] `packages/db/schema/providers.ts` — `providerTypeEnum` updated
- [ ] DB migration SQL file created
- [ ] `_journal.json` updated
- [ ] `apps/api/config/providers.ts` — provider registered
- [ ] `apps/api/package.json` — dependency added
- [ ] `bun install` — clean
- [ ] `bunx tsc --noEmit` — zero new errors
- [ ] `README.md` — provider checked off in Supported Providers
- [ ] `apps/www/content/docs/storage-providers/<name>.mdx` — docs page created
- [ ] `apps/www/content/docs/storage-providers/meta.json` — slug added to `pages`
- [ ] `apps/www/content/docs/storage-providers/overview.mdx` — bullet added
