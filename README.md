<p align="center">
  <a href="https://github.com/drivebase/drivebase">
    <img src="./drivebase.svg" width="80px" alt="Drivebase Logo" />
  </a>
</p>

<h3 align="center">
  Self-Hosted Cloud File Manager
</h3>
<p align="center">
Open-source, self-hosted cloud file manager designed to unify file storage across multiple cloud providers into one seamless interface.
</p>

<p align="center"><a href="https://github.com/drivebase/drivebase/discussions">Discussions</a> · <a href="https://drivebase.github.io/docs">Documentation</a> · <a href="https://discord.gg/3kUSy2d">Discord</a></p>

---

![drivebase-banner-1](https://github.com/user-attachments/assets/fbac28ab-02ae-4077-af79-06ee938ce08b)

Drivebase is a next-generation cloud-agnostic file management application that empowers users to organize, upload, and access files across multiple cloud providers — all under one unified folder structure. With Drivebase, users can break free from cloud provider lock-in and take full control of where their files are stored.

---

## Supported Providers

Drivebase supports the following cloud providers:

- [x] S3
- [x] Local Storage
- [x] Google Drive
- [ ] FTP
- [ ] sFTP
- [ ] WebDAV
- [ ] Dropbox
- [ ] Box
- [ ] OneDrive
- [ ] Telegram


## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)


## Prerequisites

- Bun - https://bun.sh/
- Docker + Docker Compose (for container workflows)
- Postgres + Redis (if running app locally without full Docker app container)

## Getting Started

To get started with Drivebase, follow these steps:

1. Copy the example file:

```bash
cp .env.example .env
```

2. Update required values in `.env`, especially:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `VITE_PUBLIC_API_URL`

> [!NOTE]
> To generate a JWT secret or encryption key, run `openssl rand -base64 32`.

### Local Development

Install dependencies:

```bash
bun install
```

Run both API and web from root `.env`:

```bash
bun run dev
```

Run both API and web from root `.env.local`:

```bash
bun run dev:local
```

### Docker Image (Production-style Runtime)

The Docker image:

- builds frontend assets
- serves web via **Caddy** on port `3000`
- runs API via Bun internally on port `4000`
- proxies `/graphql`, `/api/*`, `/webhook/*` from Caddy to API
- runs DB migrations by default on startup

Build using Make:

```bash
make build
```

Or directly:

```bash
docker build -t drivebase-app:latest .
```

Run image with one exposed port:

```bash
docker run --rm -p 3000:3000 --env-file .env.local drivebase-app:latest
```

Open:

- App: `http://localhost:3000`
- GraphQL (through proxy): `http://localhost:3000/graphql`

### Migration Control

Migrations run on container start by default. To skip:

```bash
-e SKIP_DB_MIGRATIONS=true
```

### External API Upstream (Optional)

If API is hosted elsewhere, point Caddy proxy to external API:

```bash
-e API_UPSTREAM=https://api.example.com
```

## Docker Compose Workflows

### 1) Full Stack (App + Postgres + Redis)

Use:

```bash
docker compose up --build
```

Config file: `compose.yaml`

Exposes:

- app on `3000`
- postgres on `5432`
- redis on `6379`

### 2) Dev Infra Only (Postgres + Redis)

Use:

```bash
docker compose -f compose.dev.yaml up -d
```

Config file: `compose.dev.yaml`

This is useful when running API/Web directly via `bun run dev`.

## Build Frontend/API with Turbo

```bash
bun run build
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
