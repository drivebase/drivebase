# @drivebase/google-drive

Google Drive storage provider for Drivebase.

## Overview

This package implements the `IStorageProvider` interface for Google Drive, enabling Drivebase to use Google Drive as a storage backend with full support for:

- File upload and download
- Folder management
- File operations (move, copy, delete)
- Quota tracking
- Direct download URLs via `webContentLink`

## Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Drive API for your project

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (or Internal if you have Google Workspace)
3. Fill in the required app information:
   - App name: "Drivebase" (or your app name)
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/drive` (full Drive access)
   - Or `https://www.googleapis.com/auth/drive.file` (app-created files only)
5. Add test users if in testing mode

### 3. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
5. Save your **Client ID** and **Client Secret**

### 4. Get Refresh Token

For development, use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):

1. Click the gear icon (⚙️) in the top right
2. Check **Use your own OAuth credentials**
3. Enter your **OAuth Client ID** and **OAuth Client secret**
4. In the left panel, select **Drive API v3**
5. Choose `https://www.googleapis.com/auth/drive`
6. Click **Authorize APIs**
7. Sign in with your Google account and grant permissions
8. Click **Exchange authorization code for tokens**
9. Copy the **Refresh token** (starts with `1//`)

## Configuration

Connect Google Drive via the GraphQL API:

```graphql
mutation {
  connectStorage(input: {
    name: "My Google Drive"
    type: GOOGLE_DRIVE
    config: {
      clientId: "123456789.apps.googleusercontent.com"
      clientSecret: "GOCSPX-xxxxxxxxxxxxx"
      refreshToken: "1//xxxxxxxxxxxxx"
    }
  }) {
    id
    name
    quotaTotal
    quotaUsed
  }
}
```

## Features

### ✅ Implemented

- **Initialize**: OAuth 2.0 authentication with refresh token
- **Test Connection**: Verify credentials and API access
- **Get Quota**: Retrieve storage quota (used/total)
- **Download**: Direct download URLs via `webContentLink`
- **Create Folder**: Create folders in Drive
- **Delete**: Delete files and folders (moves to trash)
- **Move**: Move files/folders and rename
- **Copy**: Duplicate files/folders
- **List**: List files and folders with pagination
- **Get Metadata**: Retrieve file and folder metadata

### ⚠️ Limitations

- **Upload**: Direct upload implementation pending (requires interface refactor to pass metadata with file data)
- **Rate Limits**: Google Drive API has quota limits (10,000 queries per day per user by default)
- **File Size**: Maximum 5TB per file

## Usage Example

```typescript
import { GoogleDriveProvider } from "@drivebase/google-drive";

const provider = new GoogleDriveProvider();

// Initialize with OAuth credentials
await provider.initialize({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  refreshToken: "your-refresh-token",
});

// Test connection
const connected = await provider.testConnection();
console.log("Connected:", connected);

// Get quota
const quota = await provider.getQuota();
console.log(`Used: ${quota.used} / ${quota.total} bytes`);

// List files in root
const result = await provider.list({ folderId: undefined });
console.log("Files:", result.files);
console.log("Folders:", result.folders);

// Create a folder
const folderId = await provider.createFolder({ name: "My Folder" });

// Download a file
const response = await provider.requestDownload({ remoteId: "file-id" });
if (response.downloadUrl) {
  console.log("Download URL:", response.downloadUrl);
}

// Cleanup
await provider.cleanup();
```

## Configuration Schema

```typescript
{
  clientId: string;      // OAuth 2.0 Client ID
  clientSecret: string;  // OAuth 2.0 Client Secret (encrypted)
  refreshToken: string;  // OAuth 2.0 Refresh Token (encrypted)
}
```

Sensitive fields (`clientSecret`, `refreshToken`) are automatically encrypted before storage.

## Error Handling

All methods throw `ProviderError` on failure:

```typescript
import { ProviderError } from "@drivebase/core";

try {
  await provider.getQuota();
} catch (error) {
  if (error instanceof ProviderError) {
    console.error("Provider error:", error.message);
    console.error("Details:", error.details);
  }
}
```

## Development

```bash
# Install dependencies
bun install

# Type check
bunx tsc --noEmit
```

## API Reference

See the [IStorageProvider interface](../core/interfaces.ts) for the complete API specification.

## Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Drive API Scopes](https://developers.google.com/drive/api/guides/api-specific-auth)
- [Rate Limits and Quotas](https://developers.google.com/drive/api/guides/limits)

## License

MIT
