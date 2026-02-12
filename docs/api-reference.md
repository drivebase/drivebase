# API Reference

## GraphQL Endpoint

```
POST /graphql
```

## Authentication

Authentication uses JWT tokens stored in HTTP-only cookies. After successful login, the cookie is automatically set.

For testing with tools like GraphQL Playground, ensure cookies are enabled.

---

## Mutations

### Auth

#### `login`

Authenticate a user and receive a session.

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    user {
      id
      email
      role
      mustChangePassword
    }
  }
}
```

**Returns**: User object with `mustChangePassword` flag indicating if password change is required.

#### `logout`

End the current session.

```graphql
mutation {
  logout {
    success
  }
}
```

#### `changePassword`

Change the current user's password.

```graphql
mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
  changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    success
  }
}
```

#### `requestPasswordReset`

Request a password reset OTP (logged to console in development).

```graphql
mutation RequestPasswordReset($email: String!) {
  requestPasswordReset(email: $email) {
    success
  }
}
```

#### `resetPassword`

Reset password using OTP.

```graphql
mutation ResetPassword($email: String!, $otp: String!, $newPassword: String!) {
  resetPassword(email: $email, otp: $otp, newPassword: $newPassword) {
    success
  }
}
```

---

### Users

#### `createUser`

Create a new user (admin only).

```graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    role
  }
}
```

**Input**:
```graphql
input CreateUserInput {
  email: String!
  password: String!
  role: UserRole!
}
```

#### `updateUser`

Update a user's details.

```graphql
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    email
    role
  }
}
```

#### `deleteUser`

Delete a user (admin only).

```graphql
mutation DeleteUser($id: ID!) {
  deleteUser(id: $id) {
    success
  }
}
```

---

### Storage Providers

#### `connectStorage`

Connect a storage provider. This is a generic endpoint that works with any supported provider type.

```graphql
mutation ConnectStorage($input: ConnectStorageInput!) {
  connectStorage(input: $input) {
    id
    name
    type
    quotaTotal
    quotaUsed
  }
}
```

**Input**:
```graphql
input ConnectStorageInput {
  name: String!
  type: ProviderType!
  config: JSON!  # Provider-specific configuration (encrypted before storage)
}
```

**Security**: All sensitive fields in the `config` object (client secrets, API keys, access tokens, etc.) are automatically encrypted using AES-256-GCM before being stored in the database. The encryption key must be set in the `ENCRYPTION_KEY` environment variable.

**Provider Configurations**:

Each provider type requires specific configuration fields:

**GOOGLE_DRIVE**:
```json
{
  "clientId": "xxx.apps.googleusercontent.com",
  "clientSecret": "GOCSPX-xxx",
  "refreshToken": "1//xxx"
}
```

**S3**:
```json
{
  "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "bucket": "my-bucket",
  "region": "us-east-1",
  "endpoint": "https://s3.amazonaws.com"  // Optional, for S3-compatible services
}
```

**LOCAL_STORAGE**:
```json
{
  "path": "/path/to/storage"
}
```

**Example**:

```graphql
# Connect Google Drive
mutation {
  connectStorage(input: {
    name: "My Google Drive"
    type: GOOGLE_DRIVE
    config: {
      clientId: "xxx.apps.googleusercontent.com"
      clientSecret: "GOCSPX-xxx"
      refreshToken: "1//xxx"
    }
  }) {
    id
    name
    type
  }
}

# Connect S3
mutation {
  connectStorage(input: {
    name: "AWS Bucket"
    type: S3
    config: {
      accessKeyId: "AKIA..."
      secretAccessKey: "..."
      bucket: "my-bucket"
      region: "us-east-1"
    }
  }) {
    id
  }
}

# Connect Local Storage
mutation {
  connectStorage(input: {
    name: "External Drive"
    type: LOCAL_STORAGE
    config: {
      path: "/mnt/external-drive"
    }
  }) {
    id
  }
}
```

#### `disconnectProvider`

Disconnect a storage provider.

```graphql
mutation DisconnectProvider($id: ID!) {
  disconnectProvider(id: $id) {
    success
  }
}
```

#### `syncProvider`

Sync quota and file information from provider.

```graphql
mutation SyncProvider($id: ID!) {
  syncProvider(id: $id) {
    id
    quotaTotal
    quotaUsed
    lastSyncAt
  }
}
```

---

### Folders

#### `createFolder`

Create a new folder.

```graphql
mutation CreateFolder($input: CreateFolderInput!) {
  createFolder(input: $input) {
    id
    name
    virtualPath
  }
}
```

**Input**:
```graphql
input CreateFolderInput {
  name: String!
  parentPath: String!
}
```

#### `renameFolder`

Rename a folder.

```graphql
mutation RenameFolder($id: ID!, $name: String!) {
  renameFolder(id: $id, name: $name) {
    id
    name
    virtualPath
  }
}
```

#### `moveFolder`

Move a folder to a new location.

```graphql
mutation MoveFolder($id: ID!, $newParentPath: String!) {
  moveFolder(id: $id, newParentPath: $newParentPath) {
    id
    virtualPath
  }
}
```

#### `deleteFolder`

Delete a folder and its contents.

```graphql
mutation DeleteFolder($id: ID!) {
  deleteFolder(id: $id) {
    success
  }
}
```

---

### Files

#### `requestUpload`

Request an upload URL for a new file.

```graphql
mutation RequestUpload($input: RequestUploadInput!) {
  requestUpload(input: $input) {
    uploadUrl
    fileId
    method
    headers
  }
}
```

**Input**:
```graphql
input RequestUploadInput {
  filename: String!
  folderPath: String!
  providerId: ID!
  size: Int!
  mimeType: String!
}
```

**Response**:
- `uploadUrl`: URL to upload the file (presigned or API endpoint)
- `fileId`: ID of the created file record
- `method`: HTTP method to use (PUT or POST)
- `headers`: Optional headers to include in upload request

#### `confirmUpload`

Confirm that a file upload completed successfully.

```graphql
mutation ConfirmUpload($fileId: ID!) {
  confirmUpload(fileId: $fileId) {
    id
    name
    size
    status
  }
}
```

#### `requestDownload`

Get a download URL for a file.

```graphql
mutation RequestDownload($fileId: ID!) {
  requestDownload(fileId: $fileId) {
    downloadUrl
    expiresAt
  }
}
```

#### `renameFile`

Rename a file.

```graphql
mutation RenameFile($id: ID!, $name: String!) {
  renameFile(id: $id, name: $name) {
    id
    name
  }
}
```

#### `moveFile`

Move a file to a different folder.

```graphql
mutation MoveFile($id: ID!, $newFolderPath: String!) {
  moveFile(id: $id, newFolderPath: $newFolderPath) {
    id
    virtualPath
  }
}
```

#### `deleteFile`

Delete a file.

```graphql
mutation DeleteFile($id: ID!) {
  deleteFile(id: $id) {
    success
  }
}
```

---

### Permissions

#### `grantFolderAccess`

Grant a user access to a folder.

```graphql
mutation GrantFolderAccess($input: GrantAccessInput!) {
  grantFolderAccess(input: $input) {
    id
    userId
    folderId
    level
  }
}
```

**Input**:
```graphql
input GrantAccessInput {
  folderId: ID!
  userId: ID!
  level: PermissionLevel!  # VIEW, EDIT, ADMIN
}
```

#### `revokeFolderAccess`

Revoke a user's access to a folder.

```graphql
mutation RevokeFolderAccess($folderId: ID!, $userId: ID!) {
  revokeFolderAccess(folderId: $folderId, userId: $userId) {
    success
  }
}
```

---

## Queries

### Users

#### `me`

Get the current authenticated user.

```graphql
query {
  me {
    id
    email
    role
    createdAt
  }
}
```

#### `users`

List all users (admin only).

```graphql
query Users($limit: Int, $offset: Int) {
  users(limit: $limit, offset: $offset) {
    nodes {
      id
      email
      role
      createdAt
    }
    totalCount
  }
}
```

#### `user`

Get a specific user by ID.

```graphql
query User($id: ID!) {
  user(id: $id) {
    id
    email
    role
    createdAt
  }
}
```

---

### Storage Providers

#### `storageProviders`

List connected storage providers.

```graphql
query {
  storageProviders {
    id
    name
    type
    quotaTotal
    quotaUsed
    lastSyncAt
    createdAt
  }
}
```

#### `storageProvider`

Get a specific storage provider.

```graphql
query StorageProvider($id: ID!) {
  storageProvider(id: $id) {
    id
    name
    type
    quotaTotal
    quotaUsed
  }
}
```

---

### Folders

#### `folder`

Get a folder by path or ID.

```graphql
query Folder($path: String, $id: ID) {
  folder(path: $path, id: $id) {
    id
    name
    virtualPath
    children {
      id
      name
    }
    files {
      id
      name
      size
    }
  }
}
```

#### `folderTree`

Get the full folder tree.

```graphql
query FolderTree($rootPath: String) {
  folderTree(rootPath: $rootPath) {
    id
    name
    virtualPath
    children {
      id
      name
      virtualPath
    }
  }
}
```

---

### Files

#### `files`

List files in a folder.

```graphql
query Files($folderPath: String!, $limit: Int, $offset: Int) {
  files(folderPath: $folderPath, limit: $limit, offset: $offset) {
    nodes {
      id
      name
      size
      mimeType
      createdAt
      updatedAt
    }
    totalCount
  }
}
```

#### `file`

Get a specific file.

```graphql
query File($id: ID!) {
  file(id: $id) {
    id
    name
    virtualPath
    size
    mimeType
    provider {
      id
      name
      type
    }
    createdAt
    updatedAt
  }
}
```

#### `searchFiles`

Search for files by name.

```graphql
query SearchFiles($query: String!, $limit: Int) {
  searchFiles(query: $query, limit: $limit) {
    id
    name
    virtualPath
    size
  }
}
```

---

### Activity Logs

#### `activityLogs`

Get activity logs (admin only).

```graphql
query ActivityLogs($limit: Int, $offset: Int, $userId: ID, $action: String) {
  activityLogs(limit: $limit, offset: $offset, userId: $userId, action: $action) {
    nodes {
      id
      userId
      action
      resourceType
      resourceId
      metadata
      createdAt
    }
    totalCount
  }
}
```

---

## Types

### Enums

```graphql
enum UserRole {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

enum PermissionLevel {
  VIEW
  EDIT
  ADMIN
}

enum ProviderType {
  GOOGLE_DRIVE
  S3
  LOCAL_STORAGE
}

enum FileStatus {
  PENDING
  UPLOADING
  READY
  ERROR
}
```

### Error Handling

Errors are returned in the standard GraphQL format:

```json
{
  "errors": [
    {
      "message": "Not authorized",
      "extensions": {
        "code": "UNAUTHORIZED"
      }
    }
  ]
}
```

Common error codes:
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Not enough permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input
- `RATE_LIMITED`: Too many requests
