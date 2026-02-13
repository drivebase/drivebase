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

You can get started with Drivebase in two ways:

## Docker (recommended)

1. Create env file:

```bash
cp .env.example .env.local
```

2. Update `.env.local` with required values:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `CORS_ORIGIN`
- `API_BASE_URL`

3. Start Postgres + Redis (if not already running):

```bash
docker compose -f compose.dev.yaml up -d
```

4. Pull the deployed image:

```bash
docker pull ghcr.io/drivebase/drivebase:v1.1.0
```

5. Run Drivebase:

```bash
docker run --rm -p 3000:3000 --env-file .env.local ghcr.io/drivebase/drivebase:v1.1.0
```

6. Open:

- App: `http://localhost:3000`
- GraphQL: `http://localhost:3000/graphql`

## Manual Installation

1. Copy the example file:

```bash
cp .env.example .env.local
```

2. Update required values in `.env.local`, especially:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `VITE_PUBLIC_API_URL`

> [!NOTE]
> To generate a JWT secret or encryption key, run `openssl rand -base64 32`.

3. Install dependencies:

```bash
bun install
```

4. Start the server:

```bash
bun run dev
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
