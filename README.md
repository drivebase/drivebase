<p align="center">
  <img src="apps/web/public/drivebase.svg" alt="Drivebase" width="80" />
</p>

<h1 align="center">Drivebase</h1>

<p align="center">
  Your cloud storage. One OS. Runs anywhere.
</p>


<p align="center">
  <a href="https://github.com/drivebase/drivebase/releases"><img src="https://img.shields.io/github/v/release/drivebase/drivebase?style=flat-square" alt="Release" /></a>
  <a href="https://github.com/drivebase/drivebase/blob/main/LICENSE"><img src="https://img.shields.io/github/license/drivebase/drivebase?style=flat-square" alt="License" /></a>
  <a href="https://github.com/drivebase/drivebase/stargazers"><img src="https://img.shields.io/github/stars/drivebase/drivebase?style=flat-square" alt="Stars" /></a>
  <a href="https://deepwiki.com/drivebase/drivebase"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

---

[Watch demo](https://x.com/i/status/2048080132418728354)

Drivebase is an open-source, self-hosted platform that connects your cloud storage providers — Google Drive, S3, local filesystem, and more — under a single interface. Browse, upload, transfer, and manage files across providers without touching each service separately.

The UI is designed as a desktop OS shell running in the browser. Apps (Files, Providers, Settings) open as windows you can move, resize, and switch between — making it feel like a native file manager rather than a typical web dashboard.

> [!WARNING]
> **v4 is still in active development.** Expect breaking changes, incomplete features, and shifting APIs until a stable release is tagged.

## Quick Install

Run the installer in a terminal:

```bash
curl -fsSL https://drivebase.io/install | bash
```

This will create a `drivebase/` directory with Docker Compose and a pre-configured `config.toml` (secrets auto-generated). After it finishes:

```bash
cd drivebase
docker compose up -d
```

Then open `http://localhost:4000`.

## Features

- **OS-like interface** — windowed apps, a taskbar, and a desktop shell; feels like a native file manager in the browser
- **Unified file browser** — navigate folders and files across all connected providers in one place
- **Multi-provider support** — Google Drive, AWS S3 (and S3-compatible services), local filesystem
- **Batch operations** — copy, move, transfer, and delete across providers with preflight conflict analysis
- **Smart conflict resolution** — detect conflicts before they happen; resolve with overwrite, skip, rename, or manual review
- **Real-time progress** — live operation status via server-sent events; no polling required
- **Resumable uploads** — chunked upload sessions survive browser reloads
- **Direct S3 uploads** — presigned multipart URLs let clients upload straight to S3, bypassing the server
- **Storage usage** — per-provider quota and usage tracking with on-demand refresh
- **Pluggable provider system** — clean `IStorageProvider` interface makes adding new backends straightforward
- **GraphQL API** — every capability is exposed through a typed GraphQL API

## Supported Providers

- [x] Google Drive
- [x] AWS S3 / S3-compatible (Cloudflare R2, Wasabi, Backblaze B2, MinIO, etc.)
- [x] Local Filesystem
- [ ] Dropbox
- [ ] OneDrive
- [ ] Box
- [ ] Azure Blob Storage
- [ ] SFTP

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Frontend | React 19, Vite, TanStack Router, Tailwind CSS 4 |
| API | GraphQL Yoga, graphql-sse |
| Workers | BullMQ |
| Database | PostgreSQL (Drizzle ORM) |
| Cache / Queue | Redis (ioredis) |
| Auth | Better Auth (cookie-based) |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.5 or later
- PostgreSQL 15+
- Redis 7+

### 1. Clone and install

```bash
git clone https://github.com/drivebase/drivebase.git
cd drivebase
bun install
```

### 2. Configure

Copy the example config and fill in your values:

```bash
cp packages/config/config.example.toml config.toml
```

Minimum required values:

```toml
[server]
env = "prod"
port = 4000
host = "0.0.0.0"

[db]
url = "postgres://user:password@localhost:5432/drivebase"

[redis]
url = "redis://localhost:6379/0"

[crypto]
# Generate: openssl rand -base64 32
masterKeyBase64 = "<base64-encoded-32-byte-key>"

[auth]
# Generate: openssl rand -hex 32
betterAuthSecret = "<random-secret>"
baseUrl = "http://localhost:4000"
trustedOrigins = ["http://localhost:3000"]
```

### 3. Run migrations

```bash
bun run db:migrate
```

### 4. Start

```bash
bun run dev
```

- API: `http://localhost:4000`
- Web UI: `http://localhost:3000`

## Contributing

Contributions are welcome. Please open an issue before starting significant work so we can align on direction.

1. Fork the repository
2. Create a feature branch
3. Make your changes — run `bun run typecheck` and `bun test` before pushing
4. Open a pull request

## License

[MIT](LICENSE)
