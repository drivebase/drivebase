# Drivebase

Self-hosted file management platform. Connect your Google Drive, S3-compatible storage, or local filesystem and manage everything through a single API.

## Features

- Unified access across multiple storage providers
- Cross-provider file transfer and sync
- Shareable links with optional password, expiry, and permissions
- Workspace-based multi-tenancy with role-based access control
- Background job processing for transfers and sync

## Requirements

- Docker and Docker Compose

## Setup

1. Copy the example config and fill in the required values:
   ```bash
   cp config.example.toml config.toml
   ```

   At minimum, set `auth.jwt_secret` and `crypto.encryption_key`.

2. Start everything:
   ```bash
   docker compose up -d
   ```

   The API will be available at `http://localhost:8080`.

3. The GraphQL playground is at `http://localhost:8080/graphql` (development mode only).

## Running Tests

**Unit tests:**
```bash
make test
```

**End-to-end tests** (requires Docker — spins up its own containers automatically):
```bash
make e2e
```

## Logs

Logs are written to `./data/logs/drivebase.log`. When reporting a bug, share this file.

## License

MIT
