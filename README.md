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

<img width="2401" height="1080" alt="banner" src="https://github.com/user-attachments/assets/e50c76ef-1b8f-417d-901b-e1b391472204" />

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
  - [Quick Start](#quick-start-automated)
  - [Docker](#docker)
  - [Manual Installation](#manual-installation)
- [Contributing](#contributing)
- [License](#license)


## Prerequisites

- Bun - https://bun.sh/
- Docker + Docker Compose (for container workflows)
- Postgres + Redis (if running app locally without full Docker app container)

## Getting Started

Choose the installation method that suits your needs:

- [**Quick Start**](#quick-start) - Recommended for most users.
- [**Docker**](#docker) - For custom Docker setups.
- [**Manual Installation**](#manual-installation) - For development or custom environments.

### Quick Start

The fastest way to get Drivebase running is using our automated installer script. This will set up the necessary files and configuration for you.

```bash
wget -qO- https://drivebase.one/install | bash
```

### Docker

If you prefer to set up Docker manuallyg:

1. Create env file:

```bash
cp .env.example .env.local
```

2. Update `.env.local` with required values (Database, Redis, Secrets).

3. Start services:

```bash
# Using the production compose file
wget -O compose.yaml https://drivebase.one/compose
docker compose --env-file .env.local up -d
```

### Manual Installation

For local development or running from source:

1. Copy the example file:

```bash
cp .env.example .env.local
```

2. Update required values in `.env.local`.

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
