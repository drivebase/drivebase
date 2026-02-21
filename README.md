<img width="2167" height="1281" alt="drivebase-banner" src="https://github.com/user-attachments/assets/3efd4f99-6b98-462a-867a-cf805e212c86" />


<p align="center">
  <a href="https://t.me/+fWEMYD3gp61lYWZl">
    <img src="https://img.shields.io/badge/Telegram-Join%20Chat-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram">
  </a> · 
  <a href="https://drivebase.one/docs">
    <img src="https://img.shields.io/badge/Documentation-red?style=for-the-badge" alt="Documentation" />
  </a> · 
  <a href="https://discord.gg/zy3XyWcU6D">
    <img src="https://img.shields.io/discord/1472108078592688149?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=5865F2" alt="Discord">
  </a>
</p>

Drivebase is a next-generation cloud-agnostic file management application that empowers users to organize, upload, and access files across multiple cloud providers — all under one unified folder structure. It includes Vault for end-to-end encrypted uploads and Smart Uploads for rule-based routing across providers. With Drivebase, users can break free from cloud provider lock-in and take full control of where their files are stored.

<a href="https://drivebase.one/features/vault">Vault</a> · <a href="https://drivebase.one/features/smart-upload">Smart Upload</a> · <a href="https://drivebase.one/features/team-collaboration">Collaboration</a>

---

<!-- [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/drivebase/drivebase)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/drivebase/drivebase) -->


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

After you start the containers, open:

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


## Support

Have questions or need help? Here's how you can reach us:

- [Discord](https://discord.gg/zy3XyWcU6D)
- [Telegram](https://t.me/+fWEMYD3gp61lYWZl)

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
