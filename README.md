<img width="2401" height="1080" alt="banner" src="https://github.com/user-attachments/assets/da988617-3fd1-4dbe-9bb2-35f5c7495ca0" />

<p align="center"><a href="https://github.com/drivebase/drivebase/discussions">Discussions</a> · <a href="https://drivebase.one/docs">Documentation</a> · <a href="https://discord.gg/zy3XyWcU6D">Discord</a></p>

Drivebase is a next-generation cloud-agnostic file management application that empowers users to organize, upload, and access files across multiple cloud providers — all under one unified folder structure. With Drivebase, users can break free from cloud provider lock-in and take full control of where their files are stored.

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
- [Quickstart (Recommended)](#quickstart-recommended)
- [Docker Compose](#docker-compose)
- [Manual Installation](#manual-installation)
  - [Prerequisites](#prerequisites)
  - [Steps](#steps)
- [Supported Providers](#supported-providers)
- [Contributing](#contributing)
- [License](#license)
- [Star History](#star-history)

## Getting Started

You can get started with Drivebase in multiple ways:

## Quickstart (Recommended)


Run the following command to install Drivebase using our automated installer. It uses Docker Compose to set up your environment and generate secure keys automatically.

```bash
curl -fsSL https://drivebase.one/install | bash
```

<img width="600" alt="Group" src="https://github.com/user-attachments/assets/19e11300-83e1-4e8b-a31e-17be9e2f81c9" />

You will need to update the `.env.local` file with your own values for PostgreSQL, Redis, and other required values.


## Docker Compose

1. Clone the repository:

```bash
git clone https://github.com/drivebase/drivebase.git
cd drivebase
```

2. Update `.env.local` with required values:

3. Start Postgres + Redis (if not already running):

```bash
docker compose -f docker/compose.dev.yaml up -d
```

4. Open:

- App: `http://localhost:3000`
- GraphQL: `http://localhost:3000/graphql`

## Manual Installation

If you prefer to run the application manually without Docker Compose, you can follow the steps below.

### Prerequisites

- Bun - https://bun.sh/
- Postgres + Redis (if running app locally without full Docker app container)

### Steps

1. Clone the repository:

```bash
git clone https://github.com/drivebase/drivebase.git
cd drivebase
```

2. Install dependencies:

```bash
bun install
```

3. Update `.env.local` with required values:

```bash
cp .env.example .env.local
```

4. Start the application:

```bash
bun run dev
```

5. Open:

- App: `http://localhost:3000`
- GraphQL: `http://localhost:3000/graphql`

## Supported Providers

Drivebase supports the following cloud providers:

- [x] S3
- [x] Local Storage
- [x] Google Drive
- [x] Dropbox
- [x] FTP
- [x] WebDAV
- [x] Telegram
- [ ] sFTP
- [ ] Box
- [ ] OneDrive


## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Star History

<a href="https://www.star-history.com/#drivebase/drivebase&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=drivebase/drivebase&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=drivebase/drivebase&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=drivebase/drivebase&type=date&legend=top-left" />
 </picture>
</a>